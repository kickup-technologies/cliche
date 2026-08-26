import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { sendWhatsAppBotReply } from "@/lib/whatsapp"
import { loadBotConfig } from "@/lib/bot/brain"
import { outboundLastHour, isHumanHoursColombia, pickVariant, jitter, PROACTIVE_HOURLY_CAP } from "@/lib/bot/anti-ban"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * GET /api/cron/bot-followup — disparado por Vercel Cron (diario).
 *
 * Re-engancha a contactos que el asesor atendió pero que no respondieron.
 * Envía un mensaje cálido y descarta los follow-ups de quienes sí siguieron
 * la conversación o están en manos de un humano (handoff). Protegido por
 * CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  // FAIL-CLOSED: sin CRON_SECRET el endpoint rechaza todo — olvidar la var
  // no puede dejar el cron público (cualquiera dispararía mensajes de WhatsApp).
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    // Anti-ban: proactivos solo en horario humano de Colombia.
    if (!isHumanHoursColombia()) {
      return NextResponse.json({ ok: true, skipped: "fuera de horario humano (9-20 Bogotá)" })
    }

    const sb = createServerClient()
    const config = await loadBotConfig()
    if (!config.bot_enabled || !config.followups_enabled) {
      return NextResponse.json({ ok: true, skipped: "followups disabled" })
    }
    // Anti-ban: con flujo alto en la última hora, el marketing cede el turno.
    if ((await outboundLastHour(sb)) >= PROACTIVE_HOURLY_CAP) {
      return NextResponse.json({ ok: true, skipped: "volumen alto — corrida pausada" })
    }

    // Solo follow-ups de la conexión actual: si se vinculó otro número, los
    // pendientes del anterior no deben salir desde el número nuevo.
    if (!config.connected_phone) {
      return NextResponse.json({ ok: true, skipped: "no connected phone" })
    }
    const now = new Date().toISOString()
    const { data: due } = await sb
      .from("wa_followups")
      .select("id, contact_phone")
      .eq("status", "pending")
      .eq("session_phone", config.connected_phone)
      .lte("run_at", now)
      // Anti-ban: máx. 4 follow-ups por corrida, con pausas — nada de ráfagas.
      // Los que no alcancen salen en la siguiente corrida.
      .limit(4)

    let sent = 0
    let cancelled = 0
    const name = config.advisor_name || "Valentina"

    for (const f of due || []) {
      // ¿El contacto está en manos de un humano? → no molestar.
      const { data: contact } = await sb.from("wa_contacts").select("handoff").eq("phone", f.contact_phone).maybeSingle()
      // Último mensaje de la conversación.
      const { data: last } = await sb
        .from("wa_messages")
        .select("direction")
        .eq("contact_phone", f.contact_phone)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      // Si el cliente ya respondió (último mensaje entrante) o hay handoff → cancelar.
      if (contact?.handoff || last?.direction === "in") {
        await sb.from("wa_followups").update({ status: "cancelled" }).eq("id", f.id)
        cancelled++
        continue
      }

      // Anti-ban: plantillas variadas + pausa aleatoria entre envíos.
      const nudge = pickVariant([
        `Hola 🌿 soy ${name}, de Cliché. ¿Pudiste pensar en el aroma que buscabas? Con gusto te ayudo a elegir o te aparto el que más te haya gustado 😊`,
        `¡Hola! 😊 Te habla ${name}, de Cliché. Me quedé pensando en el aroma que buscabas — si quieres te doy mi recomendación o te lo aparto sin compromiso 🌿`,
        `Hola, soy ${name} 🌿 ¿Cómo vas con la elección del aroma? Si te quedaron dudas de precios o notas, me dices y te ayudo a decidir 😊`,
      ])
      if (sent > 0) await jitter()
      await sendWhatsAppBotReply(f.contact_phone, nudge, config.wasender_api_key || undefined)
      await sb.from("wa_messages").insert({ contact_phone: f.contact_phone, direction: "out", role: "assistant", body: nudge, session_phone: config.connected_phone })
      await sb.from("wa_followups").update({ status: "sent" }).eq("id", f.id)
      sent++
    }

    return NextResponse.json({ ok: true, sent, cancelled, processed: (due || []).length })
  } catch (e) {
    console.error("[cron/bot-followup]", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
