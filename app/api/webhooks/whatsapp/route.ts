import { NextRequest, NextResponse, after } from "next/server"
import { timingSafeEqual } from "crypto"
import { createServerClient } from "@/lib/supabase"
import { sendWhatsAppBotReply, sendWhatsAppDocument, decryptWasenderMedia, waNotifyAdmin } from "@/lib/whatsapp"
import { loadBotConfig, loadBotContext, generateAdvisorReply } from "@/lib/bot/brain"
import { transcribeAudio, describeImage } from "@/lib/bot/media"
import { checkContactAbuse } from "@/lib/bot/safety"
import type { AIMessage } from "@/lib/bot/ai"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
// 120s: debounce (6-12s) + posible espera de rate limit (hasta 45s) + tipeo
// simulado deben caber sin cortar la corrida a la mitad.
export const maxDuration = 120

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

// Acelerador de alertas al admin por fallas de IA: en una caída de Groq con
// tráfico alto, un aviso POR CLIENTE saturaría el WhatsApp del dueño en
// minutos. Máximo un aviso cada 15 min por instancia (var de módulo: se
// reinicia en frío, suficiente para amortiguar ráfagas en instancias tibias).
let lastAiFailNotifyAt = 0
const AI_FAIL_NOTIFY_COOLDOWN_MS = 15 * 60 * 1000

// Señales de intención de compra → avisar al equipo para cerrar la venta.
const BUY_INTENT =
  /(lo\s+quiero|quiero\s+(comprar|pedir|llevar|uno|dos|tres|\d)|me\s+lo\s+llevo|c[oó]mo\s+(compro|pago|lo\s+pido|hago\s+el\s+pedido)|hacer\s+el\s+pedido|realizar\s+(la\s+compra|el\s+pedido)|comprar(lo|los)?|lo\s+pido|me\s+interesa\s+comprar|d[oó]nde\s+pago)/i

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sb = createServerClient()
  const config = await loadBotConfig()

  // ── Verificación de firma — FAIL-CLOSED ─────────────────────────────────────
  // Sin secret configurado se RECHAZA todo: antes (fail-open) cualquiera podía
  // inyectar mensajes falsos al bot mientras el setup estuviera incompleto.
  const webhookSecret = config.wasender_webhook_secret || process.env.WASENDER_WEBHOOK_SECRET || ""
  if (!webhookSecret) {
    console.warn("[WA] webhook sin secret configurado — rechazado (configura WASENDER_WEBHOOK_SECRET o el secret del panel)")
    return NextResponse.json({ ok: false, error: "webhook not configured" }, { status: 401 })
  }
  {
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
  const msgContent = (messages.message ?? {}) as Record<string, Record<string, string> | undefined>

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
  // session_phone = número de WhatsApp vinculado: el panel muestra SOLO las
  // conversaciones de la conexión actual (las de números anteriores se ocultan).
  const sessionPhone = config.connected_phone || null
  await sb
    .from("wa_contacts")
    .upsert({ phone: from, last_seen: new Date().toISOString(), session_phone: sessionPhone }, { onConflict: "phone" })
  await sb.from("wa_contacts").update({ unread: 1, last_seen: new Date().toISOString(), session_phone: sessionPhone }).eq("phone", from)
  const { data: inboundRow } = await sb
    .from("wa_messages")
    .insert({
      contact_phone: from,
      direction: "in",
      role: "user",
      body: body || "(mensaje multimedia)",
      wa_message_id: msgId || null,
      session_phone: sessionPhone,
    })
    .select("id, created_at")
    .maybeSingle()

  // Bot apagado → solo registrar.
  if (!config.bot_enabled) return NextResponse.json({ ok: true, stored: true, bot: "disabled" })

  // Handoff: humano tomó la conversación → el bot no responde.
  const { data: contact } = await sb.from("wa_contacts").select("handoff, tags").eq("phone", from).maybeSingle()
  if (contact?.handoff) return NextResponse.json({ ok: true, stored: true, bot: "handoff" })

  // Anti-abuso: si el contacto inunda el chat o lo usa indebidamente, pausa el bot.
  const abuse = await checkContactAbuse(sb, from)
  if (abuse.blocked) {
    await sb.from("wa_contacts").update({ handoff: true }).eq("phone", from)
    await waNotifyAdmin(`⚠️ Bot pausado para +${from} por posible abuso: ${abuse.reason}. Revísalo en el panel.`, config.wasender_api_key || undefined)
    return NextResponse.json({ ok: true, blocked: "abuse" })
  }

  // ── Trabajo pesado DESPUÉS de responder 200 (IA + envío con delays) ──────────
  after(async () => {
    const apiKey = config.wasender_api_key || undefined
    try {
      // Anti-ban / anti-ráfaga: si el cliente manda varios mensajes seguidos
      // ("hola" / "quiero un aroma" / "para mi marca"), responder cada uno por
      // separado se ve robótico y triplica los envíos. Espera breve y, si ya
      // llegó un mensaje MÁS NUEVO de este contacto, esta corrida se retira:
      // la corrida del último mensaje responde UNA vez con todo el contexto.
      // 6s de debounce + 0-6s ALEATORIOS: si 10 clientes escriben en el mismo
      // segundo, el escalonamiento reparte las llamadas a la IA dentro de la
      // ventana del rate limit en vez de estrellarlas todas al mismo instante.
      await new Promise((r) => setTimeout(r, 6000 + Math.random() * 6000))
      // ¿Llegó un mensaje MÁS NUEVO de este contacto durante la espera? Esta
      // corrida cede el turno de RESPONDER (la del último mensaje contesta una
      // sola vez con todo el contexto) — pero OJO: la transcripción/descripción
      // de la media de ESTE mensaje sí se hace abajo antes de retirarse, para
      // que el historial no quede con "(mensaje multimedia)" sin contenido.
      const superseded = async (): Promise<boolean> => {
        if (!inboundRow?.id || !inboundRow.created_at) return false
        const { data: newer } = await sb
          .from("wa_messages")
          .select("id")
          .eq("contact_phone", from)
          .eq("direction", "in")
          .gt("created_at", inboundRow.created_at)
          .neq("id", inboundRow.id)
          .limit(1)
          .maybeSingle()
        return !!newer
      }
      // Texto efectivo del cliente: el texto/caption, o el resultado de procesar
      // una nota de voz (transcripción) o una imagen (descripción de visión).
      let userText = body
      if (!userText) {
        const audio = msgContent.audioMessage || msgContent.pttMessage
        const image = msgContent.imageMessage
        if (audio) {
          const url = await decryptWasenderMedia(msgId, "audioMessage", audio, apiKey)
          const t = url ? await transcribeAudio(url) : null
          if (t) {
            userText = t
            if (inboundRow?.id) await sb.from("wa_messages").update({ body: `🎤 ${t}`, media_type: "audio" }).eq("id", inboundRow.id)
          }
        } else if (image) {
          const url = await decryptWasenderMedia(msgId, "imageMessage", image, apiKey)
          const caption = (image.caption as string) || ""
          const d = url ? await describeImage(url, caption) : null
          if (d) {
            userText = caption ? `${caption}\n[Imagen del cliente: ${d}]` : `[El cliente envió una imagen: ${d}]`
            if (inboundRow?.id) await sb.from("wa_messages").update({ body: caption ? `🖼️ ${caption}` : `🖼️ ${d.slice(0, 100)}`, media_url: url, media_type: "image" }).eq("id", inboundRow.id)
          }
        }
      }

      // Media ya procesada y guardada: si otra corrida más nueva va a responder,
      // esta se retira SIN enviar nada (anti-ráfaga / anti-ban).
      if (await superseded()) return

      // Si no se pudo entender la media → pedir un textito con calidez.
      if (!userText) {
        const ask = "¡Hola! 🌿 Por aquí no me cargó bien tu mensaje. ¿Me cuentas en un textico qué aroma o para qué marca buscas?"
        const askDelivered = await sendWhatsAppBotReply(from, ask, apiKey)
        // Solo registrar lo que el cliente SÍ recibió: un rechazo guardado
        // engañaría al panel y a la IA (creería que ya respondió).
        if (askDelivered) {
          await sb.from("wa_messages").insert({ contact_phone: from, direction: "out", role: "assistant", body: ask, session_phone: sessionPhone })
        }
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

      // El último turno del usuario debe usar el texto efectivo (audio/imagen ya procesados).
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].role === "user") { history[i].content = userText; break }
      }

      const result = await generateAdvisorReply(history, ctx)
      // Segundo chequeo: si durante la generación de la IA (~5-15s) llegó otro
      // mensaje del cliente, esta respuesta ya está desactualizada — se descarta
      // y responde la corrida del mensaje más nuevo (una sola respuesta, al día).
      if (await superseded()) return
      const catalogUrl = ctx.config.catalog_pdf_url || config.catalog_pdf_url
      console.log(`[WA] reply len=${result.text.length} sendCatalogPdf=${result.sendCatalogPdf} hasCatalogUrl=${!!catalogUrl}`)
      const delivered = await sendWhatsAppBotReply(from, result.text, apiKey)
      if (!delivered) {
        // WaSender rechazó el envío: NO guardar la respuesta (el historial debe
        // reflejar solo lo que el cliente recibió) y avisar al dueño.
        console.error("[WA] WaSender rechazó la respuesta para", from)
        await waNotifyAdmin(
          `⚠️ WhatsApp no aceptó la respuesta del asistente para +${from}. El mensaje del cliente quedó en el panel — respóndele desde Conversaciones.`,
          apiKey,
        )
        return
      }
      await sb.from("wa_messages").insert({ contact_phone: from, direction: "out", role: "assistant", body: result.text, session_phone: sessionPhone })

      if (result.sendCatalogPdf && catalogUrl) {
        await sendWhatsAppDocument(from, catalogUrl, "Catalogo-Cliche.pdf", "Aquí tienes nuestro catálogo completo 🌿", apiKey)
        await sb.from("wa_messages").insert({
          contact_phone: from,
          direction: "out",
          role: "assistant",
          body: "📎 Catálogo enviado",
          media_url: catalogUrl,
          media_type: "document",
          session_phone: sessionPhone,
        })
      }

      // Intención de compra → avisa al equipo (una sola vez por contacto).
      if (BUY_INTENT.test(userText)) {
        const tags = (contact?.tags as string[] | null) || []
        if (!tags.includes("compra")) {
          await sb.from("wa_contacts").update({ tags: [...tags, "compra"] }).eq("phone", from)
          await waNotifyAdmin(`🛒 Posible venta — +${from} mostró intención de compra.\nDijo: "${userText.slice(0, 140)}"\nCiérrala en el panel (Asistente WhatsApp).`, apiKey)
        }
      }

      if (config.followups_enabled) {
        const runAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        await sb.from("wa_followups").delete().eq("contact_phone", from).eq("status", "pending")
        await sb.from("wa_followups").insert({ contact_phone: from, run_at: runAt, kind: "nudge", session_phone: sessionPhone })
      }
    } catch (e) {
      console.error("[WA] error generando respuesta:", e)
      // El cliente escribió y NADIE va a responderle (IA caída / rate limit
      // agotado): avisar al dueño para que lo atienda desde el panel. El
      // mensaje ya quedó guardado y en no-leídos; esto añade el aviso activo.
      try {
        if (Date.now() - lastAiFailNotifyAt > AI_FAIL_NOTIFY_COOLDOWN_MS) {
          lastAiFailNotifyAt = Date.now()
          await waNotifyAdmin(
            `⚠️ El asistente no pudo responder a +${from} (falla de IA). Puede haber más clientes esperando — revisa Conversaciones en el panel.`,
            apiKey,
          )
        }
      } catch { /* best-effort */ }
    }
  })

  return NextResponse.json({ ok: true, queued: true })
}
