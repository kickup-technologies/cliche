import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { sendWhatsAppBotReply } from "@/lib/whatsapp"
import { loadBotConfig } from "@/lib/bot/brain"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

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
    const sb = createServerClient()
    const config = await loadBotConfig()
    if (!config.bot_enabled || !config.followups_enabled) {
      return NextResponse.json({ ok: true, skipped: "followups disabled" })
    }

    const now = new Date().toISOString()
    const { data: due } = await sb
      .from("wa_followups")
      .select("id, contact_phone")
      .eq("status", "pending")
      .lte("run_at", now)
      .limit(50)

    let sent = 0
    let cancelled = 0
    const name = config.advisor_name || "Valentina"
    const nudge = `Hola 🌿 soy ${name}, de Cliché. ¿Pudiste pensar en el aroma que buscabas? Con gusto te ayudo a elegir o te aparto el que más te haya gustado 😊`

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

      await sendWhatsAppBotReply(f.contact_phone, nudge, config.wasender_api_key || undefined)
      await sb.from("wa_messages").insert({ contact_phone: f.contact_phone, direction: "out", role: "assistant", body: nudge })
      await sb.from("wa_followups").update({ status: "sent" }).eq("id", f.id)
      sent++
    }

    return NextResponse.json({ ok: true, sent, cancelled, processed: (due || []).length })
  } catch (e) {
    console.error("[cron/bot-followup]", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
