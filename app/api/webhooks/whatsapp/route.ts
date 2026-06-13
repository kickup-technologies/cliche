import { NextRequest, NextResponse, after } from "next/server"
import { timingSafeEqual } from "crypto"
import { createServerClient } from "@/lib/supabase"
import { sendWhatsAppBotReply, sendWhatsAppDocument } from "@/lib/whatsapp"
import { loadBotConfig, loadBotContext, generateAdvisorReply } from "@/lib/bot/brain"
import type { AIMessage } from "@/lib/bot/ai"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

// ── Webhook de WhatsApp (WaSenderAPI) — single-tenant para Cliché ─────────────
// Apuntar el webhook de la sesión en wasenderapi.com a:
//   https://<dominio-cliche>/api/webhooks/whatsapp
// Eventos: messages.received, session.status.
//
// Verificación (según docs WaSenderAPI): el header X-Webhook-Signature contiene
// el "Webhook Secret" TAL CUAL (no es un HMAC) → se compara directo con el
// secret guardado. Responder 200 rápido; el trabajo pesado va en after().

export async function GET() {
  return NextResponse.json({ ok: true, service: "cliche-whatsapp-bot" })
}

interface WaKey {
  id?: string
  fromMe?: boolean
  remoteJid?: string
  cleanedSenderPn?: string
  cleanedParticipantPn?: string
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sb = createServerClient()
  const config = await loadBotConfig()

  // ── Verificación de firma (si hay secret configurado) ───────────────────────
  const webhookSecret = config.wasender_webhook_secret || process.env.WASENDER_WEBHOOK_SECRET || ""
  if (webhookSecret) {
    const sig = req.headers.get("x-webhook-signature") ?? req.headers.get("x-wasender-signature") ?? ""
    let valid = false
    try {
      const a = Buffer.from(sig)
      const b = Buffer.from(webhookSecret)
      valid = a.length === b.length && timingSafeEqual(a, b)
    } catch {
      valid = false
    }
    if (!valid) {
      console.warn("[WA] firma de webhook inválida — rechazado")
      return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 })
    }
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 })
  }

  const event = payload.event as string | undefined
  sb.from("wa_events").insert({ type: event || "unknown", payload }).then(undefined, () => {})

  // Eventos de conexión de la sesión (connected | disconnected | need_scan).
  if (event === "session.status" || event === "connection.update") {
    return NextResponse.json({ ok: true, event })
  }
  if (event !== "messages.received") {
    return NextResponse.json({ ok: true, skipped: event })
  }

  // ── Mensaje entrante ─────────────────────────────────────────────────────────
  const data = (payload.data ?? {}) as Record<string, unknown>
  const messages = (data.messages ?? {}) as Record<string, unknown>
  const key = (messages.key ?? {}) as WaKey

  if (key?.fromMe) return NextResponse.json({ ok: true, skipped: "fromMe" })

  const remoteJid = key.remoteJid ?? ""
  const from = ((key.cleanedParticipantPn ?? key.cleanedSenderPn) as string | undefined)?.replace(/\D/g, "") ?? ""
  const body = ((messages.messageBody as string) ?? "").trim()
  const msgId = (key.id as string) ?? ""

  // Ignorar grupos: si NO hay cleanedSenderPn/Participant y el jid es de grupo.
  if (typeof remoteJid === "string" && remoteJid.endsWith("@g.us") && !key.cleanedParticipantPn) {
    return NextResponse.json({ ok: true, skipped: "group" })
  }
  if (!from) return NextResponse.json({ ok: true, skipped: "no-sender" })

  // Dedupe por id de mensaje (reintentos del webhook).
  if (msgId) {
    const { data: dup } = await sb.from("wa_messages").select("id").eq("wa_message_id", msgId).limit(1).maybeSingle()
    if (dup) return NextResponse.json({ ok: true, skipped: "duplicate" })
  }

  // Upsert del contacto + persistir entrante (operaciones rápidas).
  await sb.from("wa_contacts").upsert({ phone: from, last_seen: new Date().toISOString() }, { onConflict: "phone" })
  await sb.from("wa_contacts").update({ unread: 1, last_seen: new Date().toISOString() }).eq("phone", from)
  await sb.from("wa_messages").insert({
    contact_phone: from,
    direction: "in",
    role: "user",
    body: body || "(mensaje multimedia)",
    wa_message_id: msgId || null,
  })

  // Bot apagado → solo registrar.
  if (!config.bot_enabled) return NextResponse.json({ ok: true, stored: true, bot: "disabled" })

  // Handoff: humano tomó la conversación → el bot no responde.
  const { data: contact } = await sb.from("wa_contacts").select("handoff").eq("phone", from).maybeSingle()
  if (contact?.handoff) return NextResponse.json({ ok: true, stored: true, bot: "handoff" })

  // ── Trabajo pesado DESPUÉS de responder 200 (IA + envío con delays) ──────────
  after(async () => {
    const apiKey = config.wasender_api_key || undefined
    try {
      // Sin texto utilizable → pedir amablemente que escriba.
      if (!body) {
        const ask = "¡Hola! 🌿 Cuéntame por aquí en qué te puedo ayudar y con gusto te asesoro."
        await sendWhatsAppBotReply(from, ask, apiKey)
        await sb.from("wa_messages").insert({ contact_phone: from, direction: "out", role: "assistant", body: ask })
        return
      }

      const ctx = await loadBotContext()
      const { data: histRows } = await sb
        .from("wa_messages")
        .select("direction, body")
        .eq("contact_phone", from)
        .order("created_at", { ascending: false })
        .limit(20)
      const history: AIMessage[] = (histRows || [])
        .reverse()
        .map((m) => ({ role: m.direction === "in" ? "user" : "assistant", content: m.body }))

      const result = await generateAdvisorReply(history, ctx)
      await sendWhatsAppBotReply(from, result.text, apiKey)
      await sb.from("wa_messages").insert({ contact_phone: from, direction: "out", role: "assistant", body: result.text })

      if (result.sendCatalogPdf && config.catalog_pdf_url) {
        await sendWhatsAppDocument(from, config.catalog_pdf_url, "Catalogo-Cliche.pdf", "Aquí tienes nuestro catálogo completo 🌿", apiKey)
        await sb.from("wa_messages").insert({
          contact_phone: from,
          direction: "out",
          role: "assistant",
          body: "📎 Catálogo enviado",
          media_url: config.catalog_pdf_url,
          media_type: "document",
        })
      }

      if (config.followups_enabled) {
        const runAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        await sb.from("wa_followups").delete().eq("contact_phone", from).eq("status", "pending")
        await sb.from("wa_followups").insert({ contact_phone: from, run_at: runAt, kind: "nudge" })
      }
    } catch (e) {
      console.error("[WA] error generando respuesta:", e)
    }
  })

  return NextResponse.json({ ok: true, queued: true })
}
