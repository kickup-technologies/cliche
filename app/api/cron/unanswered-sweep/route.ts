import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { sendWhatsAppBotReply, sendWhatsAppDocument, getSessionStatus } from "@/lib/whatsapp"
import { loadBotConfig, loadBotContext, generateAdvisorReply } from "@/lib/bot/brain"
import type { AIMessage } from "@/lib/bot/ai"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * GET /api/cron/unanswered-sweep — red de seguridad de RESPUESTAS.
 *
 * Con picos de 6+ chats distintos en el mismo minuto, los buckets gratuitos de
 * Groq se agotan y algunos clientes quedan sin respuesta (el webhook avisa al
 * admin pero no reintenta). Este barrido corre CADA 5 MIN por pg_cron
 * ('unanswered-sweep', vía pg_net + Bearer CRON_SECRET) y responde las
 * conversaciones cuyo ÚLTIMO mensaje es del cliente con >3 min de espera:
 * cuando el rate limit se libera, nadie queda en el aire.
 *
 * Guardas: bot encendido + sesión conectada, sin handoff (humano al mando),
 * ventana 3 min–24 h (más viejo ya no es "conversación en curso"), máx. 2 por
 * corrida (presupuesto de 60 s), y re-chequeo de que nadie respondió mientras
 * se generaba. Corre 24/7: responder clientes es servicio, no marketing —
 * sin puerta de horario.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const sb = createServerClient()
    const config = await loadBotConfig()
    if (!config.bot_enabled) return NextResponse.json({ ok: true, skipped: "bot apagado" })
    if (!config.connected_phone || !config.wasender_api_key) {
      return NextResponse.json({ ok: true, skipped: "sin sesión" })
    }
    if ((await getSessionStatus(config.wasender_api_key)) !== "connected") {
      return NextResponse.json({ ok: true, skipped: "sesión desconectada" })
    }

    // Últimos mensajes de la sesión actual (24h) → último por contacto.
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const threeMinAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString()
    const { data: recent } = await sb
      .from("wa_messages")
      .select("contact_phone, direction, created_at")
      .eq("session_phone", config.connected_phone)
      .gte("created_at", dayAgo)
      .order("created_at", { ascending: false })
      .limit(300)

    const lastByContact = new Map<string, { direction: string; created_at: string }>()
    for (const m of recent || []) {
      if (!lastByContact.has(m.contact_phone)) lastByContact.set(m.contact_phone, m)
    }
    // Candidatos: último mensaje ENTRANTE y con >3 min sin respuesta (si un
    // webhook legítimo siguiera procesándolo, ya habría terminado). El que
    // lleva MÁS tiempo esperando va primero — justicia de cola.
    const candidates = [...lastByContact.entries()]
      .filter(([, m]) => m.direction === "in" && m.created_at < threeMinAgo)
      .sort((a, b) => a[1].created_at.localeCompare(b[1].created_at))
      .map(([phone]) => phone)
      .slice(0, 2)

    if (candidates.length === 0) return NextResponse.json({ ok: true, pendientes: 0 })

    const ctx = await loadBotContext()
    let answered = 0
    for (const phone of candidates) {
      try {
        const { data: contact } = await sb.from("wa_contacts").select("handoff").eq("phone", phone).maybeSingle()
        if (contact?.handoff) continue

        const { data: histRows } = await sb
          .from("wa_messages")
          .select("direction, body, created_at")
          .eq("contact_phone", phone)
          .order("created_at", { ascending: false })
          .limit(20)
        const rows = (histRows || []).reverse()
        if (!rows.length || rows[rows.length - 1].direction !== "in") continue
        const lastInboundAt = rows[rows.length - 1].created_at

        const history: AIMessage[] = rows.map((m) => ({
          role: m.direction === "in" ? "user" : "assistant",
          content: m.body,
        }))
        const result = await generateAdvisorReply(history, ctx)

        // ¿Pasó ALGO en la conversación mientras la IA generaba? Una respuesta
        // (bot/humano) hace innecesario este envío; un mensaje NUEVO del
        // cliente significa que el webhook ya va a responder con más contexto —
        // en ambos casos, abortar para no duplicar.
        const { data: newer } = await sb
          .from("wa_messages")
          .select("id")
          .eq("contact_phone", phone)
          .gt("created_at", lastInboundAt)
          .limit(1)
          .maybeSingle()
        if (newer) continue

        const delivered = await sendWhatsAppBotReply(phone, result.text, config.wasender_api_key || undefined)
        if (!delivered) continue
        await sb.from("wa_messages").insert({
          contact_phone: phone,
          direction: "out",
          role: "assistant",
          body: result.text,
          session_phone: config.connected_phone,
        })
        // Si el mensaje pendiente pedía el catálogo, cumplir la promesa del
        // texto ("te lo paso 👇") adjuntando el PDF, igual que el webhook.
        const catalogUrl = ctx.config.catalog_pdf_url || config.catalog_pdf_url
        if (result.sendCatalogPdf && catalogUrl) {
          await sendWhatsAppDocument(phone, catalogUrl, "Catalogo-Cliche.pdf", "Aquí tienes nuestro catálogo completo 🌿", config.wasender_api_key || undefined)
          await sb.from("wa_messages").insert({
            contact_phone: phone,
            direction: "out",
            role: "assistant",
            body: "📎 Catálogo enviado",
            media_url: catalogUrl,
            media_type: "document",
            session_phone: config.connected_phone,
          })
        }
        answered++
      } catch (e) {
        // IA aún saturada u otro fallo: el contacto sigue pendiente y la
        // próxima corrida (5 min) lo reintenta. Nunca se pierde.
        console.warn("[unanswered-sweep] pendiente sigue pendiente:", phone, (e as Error).message?.slice(0, 120))
      }
    }

    return NextResponse.json({ ok: true, pendientes: candidates.length, respondidos: answered })
  } catch (e) {
    console.error("[unanswered-sweep]", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
