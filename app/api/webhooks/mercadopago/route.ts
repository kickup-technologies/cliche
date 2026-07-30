import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { MercadoPagoConfig, Payment } from "mercadopago"
import { createServerClient } from "@/lib/supabase"
import { confirmPaidOrder } from "@/lib/orders/confirm"
import { registerOrphanPayment } from "@/lib/orders/orphan-payments"
import { rateLimit } from "@/lib/rate-limit"

/**
 * POST /api/webhooks/mercadopago
 * Notificación de Mercado Pago (Checkout Pro).
 *
 * Seguridad: SIEMPRE consultamos el pago contra la API de Mercado Pago con el
 * Access Token (server-only) y solo confirmamos si status === "approved". Esa
 * consulta autoritativa es la que realmente protege: aunque alguien falsifique
 * el webhook, no puede confirmar un pago que no existe o no está aprobado.
 *
 * La firma `x-signature` es una capa ADICIONAL. Antes, si el
 * MERCADOPAGO_WEBHOOK_SECRET estaba mal/desactualizado, la firma no coincidía y
 * respondíamos 401 → NINGÚN pago se confirmaba jamás (causa raíz del bug: todos
 * los pedidos quedaban "pending"). Ahora una firma inválida se REGISTRA como
 * advertencia pero NO bloquea: la verificación contra la API decide.
 */
export async function POST(req: NextRequest) {
  // Anti-abuso: como una firma inválida no bloquea (para no repetir el bug de
  // "ningún pago se confirmaba"), limitamos la tasa para que nadie use este
  // endpoint como amplificador de consultas Payment.get a la API de MP con ids
  // arbitrarios. Un flujo real de MP cabe de sobra en este techo.
  const limited = rateLimit(req, { id: "mp-webhook", limit: 60, windowMs: 60_000 })
  if (limited) return limited

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

    // ── 1. Validar firma x-signature (solo advertencia si no coincide) ──
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
        // NO bloqueamos: la consulta autoritativa a la API (abajo) es la que
        // garantiza que el pago existe y está aprobado. Registramos para poder
        // detectar un secreto mal configurado sin perder ventas.
        console.warn("[mp webhook] firma x-signature no coincide — revisa MERCADOPAGO_WEBHOOK_SECRET. Se continúa vía verificación con la API.")
      }
    }

    // ── 2. Consultar el pago REAL contra la API de Mercado Pago ──
    const client = new MercadoPagoConfig({ accessToken })
    const payment = await new Payment(client).get({ id: String(dataId) })

    if (payment.status !== "approved") {
      console.log(`[mp webhook] pago ${dataId} en estado "${payment.status}" — se ignora`)
      return NextResponse.json({ received: true })
    }

    const reference = payment.external_reference
    if (!reference) {
      // Sin referencia no hay pedido web posible (los del checkout SIEMPRE la
      // llevan): es un pago externo (link manual de MP, QR, etc.). Se registra
      // como pedido sintético + alerta admin para que no quede invisible.
      console.warn(`[mp webhook] pago aprobado ${dataId} sin external_reference — se registra como pago externo`)
      try {
        await registerOrphanPayment(createServerClient(), payment)
      } catch (err) {
        console.error(`[mp webhook] no se pudo registrar pago externo ${dataId}:`, err)
      }
      return NextResponse.json({ received: true })
    }

    const supabase = createServerClient()
    const payerName = [payment.payer?.first_name, payment.payer?.last_name].filter(Boolean).join(" ") || null
    const result = await confirmPaidOrder(
      supabase,
      reference,
      { email: payment.payer?.email || null, name: payerName },
      { paidAmount: typeof payment.transaction_amount === "number" ? payment.transaction_amount : null },
    )
    console.log(`[mp webhook] pago ${dataId} aprobado — pedido ${reference}: ${result.status}`)

    // Pago aprobado SIN pedido en la BD (link de pago manual, canal externo,
    // pedido borrado): registrarlo YA como pedido sintético + alerta admin,
    // para que el dinero jamás quede invisible.
    if (result.status === "not_found") {
      try {
        await registerOrphanPayment(supabase, payment)
      } catch (err) {
        console.error(`[mp webhook] no se pudo registrar pago huérfano ${dataId}:`, err)
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error("[mp webhook]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
