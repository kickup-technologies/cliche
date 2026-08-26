import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { sendAbandonedCartEmail } from "@/lib/mailer"
import { sendWhatsAppBotReply, getSessionStatus } from "@/lib/whatsapp"
import { loadBotConfig } from "@/lib/bot/brain"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * GET /api/cron/cart-recovery — recuperación de carritos abandonados.
 *
 * Disparado CADA HORA por pg_cron de Supabase (cron.schedule 'cart-recovery' →
 * net.http_get a esta URL con Bearer CRON_SECRET). NO usa Vercel Cron: el plan
 * Hobby limita los crons y ya rechazó deploys por eso (jul-30).
 *
 * Un "carrito abandonado" = orden status='pending' creada hace 1–24h que nunca
 * confirmó Mercado Pago. Al iniciar el checkout ya quedaron capturados email,
 * teléfono y el link de pago (payment_url), así que se recupera por DOS canales:
 *  - Correo (sendAbandonedCartEmail) — idempotente vía abandoned_email_sent.
 *  - WhatsApp (mensaje cálido de la asesora con el link de pago) — idempotente
 *    vía recovery_wa_sent; SOLO si el bot está encendido y la sesión conectada,
 *    para que la asesora pueda continuar la conversación si el cliente responde.
 *
 * Sustituye al viejo /api/abandoned-cart (cron diario de Vercel, solo correo).
 */
export async function GET(req: NextRequest) {
  // FAIL-CLOSED: sin CRON_SECRET nadie puede disparar mensajes a clientes.
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const sb = createServerClient()
    const now = Date.now()
    const oneHourAgo = new Date(now - 1 * 60 * 60 * 1000).toISOString()
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString()

    const { data: orders, error } = await sb
      .from("orders")
      .select("id, stripe_session_id, customer_email, customer_phone, customer_name, items, payment_url, abandoned_email_sent, recovery_wa_sent, created_at")
      .eq("status", "pending")
      .lte("created_at", oneHourAgo)
      .gte("created_at", oneDayAgo)
      .or("abandoned_email_sent.eq.false,recovery_wa_sent.eq.false")
      .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!orders?.length) return NextResponse.json({ processed: 0 })

    // Enriquecer items (product_id → name/price/imagen) en un solo query.
    const allIds = [
      ...new Set(
        orders.flatMap((o) => ((o.items as Array<{ product_id?: string }>) || []).map((i) => i.product_id).filter(Boolean))
      ),
    ] as string[]
    const { data: products } = await sb.from("products").select("id, name, price, image_url").in("id", allIds)
    const productMap = new Map((products || []).map((p) => [p.id, p]))

    // Estado del bot: el WhatsApp de recuperación solo sale si la asesora puede
    // sostener la conversación (bot encendido + sesión conectada).
    const config = await loadBotConfig()
    let waReady = false
    if (config.bot_enabled && config.wasender_api_key) {
      waReady = (await getSessionStatus(config.wasender_api_key)) === "connected"
    }

    let emails = 0
    let whatsapps = 0
    const advisor = config.advisor_name || "Valentina"

    for (const order of orders) {
      const rawItems = (order.items as Array<{ product_id?: string; quantity?: number; name?: string; price?: number }>) || []
      const items: Array<{ name: string; price: number; image_url?: string; product_id?: string }> = []
      for (const it of rawItems) {
        const p = it.product_id ? productMap.get(it.product_id) : null
        const name = p?.name || it.name
        const price = p?.price ?? it.price
        if (!name || typeof price !== "number") continue
        items.push({ name, price, image_url: p?.image_url || undefined, product_id: it.product_id })
      }
      if (items.length === 0) continue

      const resumeUrl = (order.payment_url as string | null) || null

      // ── Correo ──
      if (!order.abandoned_email_sent && order.customer_email) {
        try {
          await sendAbandonedCartEmail(order.customer_email, items, resumeUrl)
          await sb.from("orders").update({ abandoned_email_sent: true }).eq("id", order.id)
          emails++
        } catch (e) {
          console.error("[cart-recovery] email falló para", order.id, e)
        }
      }

      // ── WhatsApp ──
      if (!order.recovery_wa_sent && order.customer_phone && waReady) {
        try {
          const firstName = (order.customer_name as string | null)?.trim().split(/\s+/)[0] || ""
          const itemTxt = items.length === 1 ? `tu *${items[0].name}*` : `tu pedido con *${items[0].name}*${items.length > 2 ? " y más aromas" : ` y *${items[1].name}*`}`
          const link = resumeUrl || "https://www.clichecolombia.com/checkout"
          const msg = `¡Hola${firstName ? ` ${firstName}` : ""}! 🌿 Soy ${advisor}, de Cliché. Vi que dejaste ${itemTxt} casi listo — te lo guardé tal como lo armaste 😊\n\nPuedes terminar tu pedido aquí, en un par de clics: ${link}\n\nSi tienes alguna duda o quieres que te recomiende otro aroma, con todo gusto te ayudo por aquí.`
          await sendWhatsAppBotReply(order.customer_phone, msg, config.wasender_api_key || undefined)
          await sb.from("orders").update({ recovery_wa_sent: true }).eq("id", order.id)
          // Registrar en el panel (pestaña Conversaciones) como mensaje del asistente.
          await sb.from("wa_messages").insert({
            contact_phone: String(order.customer_phone).replace(/\D/g, ""),
            direction: "out",
            role: "assistant",
            body: msg,
            session_phone: config.connected_phone || null,
          })
          await sb.from("wa_contacts").upsert(
            {
              phone: String(order.customer_phone).replace(/\D/g, ""),
              name: (order.customer_name as string | null) || null,
              last_seen: new Date().toISOString(),
              session_phone: config.connected_phone || null,
            },
            { onConflict: "phone" },
          )
          whatsapps++
        } catch (e) {
          console.error("[cart-recovery] whatsapp falló para", order.id, e)
        }
      }
    }

    return NextResponse.json({ processed: orders.length, emails, whatsapps, waReady })
  } catch (e) {
    console.error("[cart-recovery]", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
