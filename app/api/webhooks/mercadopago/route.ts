import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { MercadoPagoConfig, Payment } from "mercadopago"
import { createServerClient } from "@/lib/supabase"
import { sendOrderConfirmation, sendAdminOrderAlert } from "@/lib/mailer"

/**
 * POST /api/webhooks/mercadopago
 * Notificación de Mercado Pago (Checkout Pro).
 *
 * Seguridad en DOS capas:
 *  1) Verifica la firma `x-signature` con MERCADOPAGO_WEBHOOK_SECRET (si está).
 *  2) SIEMPRE consulta el pago contra la API de Mercado Pago con el Access Token
 *     y solo procesa si status === "approved". Así, aunque alguien falsifique el
 *     webhook, no puede confirmar un pago que no existe/no está aprobado.
 */
export async function POST(req: NextRequest) {
  try {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!accessToken) {
      console.error("[mp webhook] MERCADOPAGO_ACCESS_TOKEN no configurado")
      return NextResponse.json({ error: "Webhook no configurado" }, { status: 503 })
    }

    const url = new URL(req.url)
    let body: Record<string, unknown> = {}
    try { body = await req.json() } catch { /* puede venir solo por query */ }

    const type = (body.type as string) || (body.topic as string) || url.searchParams.get("type") || url.searchParams.get("topic")
    const data = (body.data as { id?: string } | undefined)
    const dataId = data?.id || url.searchParams.get("data.id") || url.searchParams.get("id")

    // Solo nos interesan notificaciones de pago
    if (type !== "payment" || !dataId) {
      return NextResponse.json({ received: true })
    }

    // ── 1. Validar firma x-signature (si hay secreto configurado) ──
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
    const xSignature = req.headers.get("x-signature")
    const xRequestId = req.headers.get("x-request-id")
    if (secret && xSignature) {
      const parts: Record<string, string> = {}
      for (const kv of xSignature.split(",")) {
        const [k, v] = kv.split("=").map((s) => s.trim())
        if (k && v) parts[k] = v
      }
      const manifest = `id:${String(dataId).toLowerCase()};request-id:${xRequestId};ts:${parts.ts};`
      const hmac = crypto.createHmac("sha256", secret).update(manifest).digest("hex")
      if (hmac !== parts.v1) {
        return NextResponse.json({ error: "Firma inválida" }, { status: 401 })
      }
    }

    // ── 2. Consultar el pago REAL contra la API de Mercado Pago ──
    const client = new MercadoPagoConfig({ accessToken })
    const payment = await new Payment(client).get({ id: String(dataId) })

    if (payment.status !== "approved") {
      return NextResponse.json({ received: true })
    }

    const reference = payment.external_reference
    if (!reference) {
      return NextResponse.json({ received: true })
    }

    const supabase = createServerClient()
    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("stripe_session_id", reference)
      .single()

    // Solo procesar si está pendiente (evita duplicados si MP reenvía la notificación)
    if (order && order.status === "pending") {
      // Preferimos lo que el cliente tecleó en el checkout; MP como respaldo.
      const customerEmail = order.customer_email || payment.payer?.email || null
      const payerName = [payment.payer?.first_name, payment.payer?.last_name].filter(Boolean).join(" ")
      const customerName = order.customer_name || payerName || null

      // 1. Confirmar la orden
      await supabase
        .from("orders")
        .update({ status: "confirmed", customer_email: customerEmail, customer_name: customerName })
        .eq("stripe_session_id", reference)

      // 2. Descontar stock (kits: cada frasco que los compone)
      for (const item of order.items || []) {
        if (item?.kind === "pack" && Array.isArray(item.components)) {
          const packQty = Number(item.quantity) || 1
          for (const c of item.components) {
            await supabase.rpc("decrement_stock", { p_product_id: c.product_id, p_quantity: (Number(c.quantity) || 0) * packQty })
          }
        } else if (item?.product_id) {
          await supabase.rpc("decrement_stock", { p_product_id: item.product_id, p_quantity: item.quantity })
        }
      }

      // 3. Registrar uso del código de descuento
      if (order.discount_code && customerEmail) {
        try {
          const { data: discountCode } = await supabase
            .from("discount_codes").select("id").eq("code", order.discount_code).single()
          if (discountCode) {
            await supabase.from("code_redemptions").upsert(
              { code_id: discountCode.id, customer_email: customerEmail, order_reference: reference },
              { onConflict: "code_id,customer_email", ignoreDuplicates: true }
            )
            await supabase.rpc("increment_uses_count", { p_code_id: discountCode.id })
          }
        } catch { /* no bloquear */ }
      }

      // 4. Suscribir email + 5. Email de confirmación
      if (customerEmail) {
        try {
          await supabase.from("subscribers").upsert(
            { email: customerEmail, source: "purchase" },
            { onConflict: "email", ignoreDuplicates: true }
          )
        } catch { /* silent */ }
        await sendOrderConfirmation(customerEmail, { id: reference, total: order.total, items: order.items || [] })
      }

      // 6. Alerta al administrador
      try {
        await sendAdminOrderAlert({
          reference,
          total: order.total,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: order.customer_phone || null,
          shipping_address: order.shipping_address || null,
          items: order.items || [],
        })
      } catch { /* no bloquear */ }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error("[mp webhook]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
