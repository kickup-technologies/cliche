import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { findApprovedPayment } from "@/lib/mercadopago"
import { confirmPaidOrder } from "@/lib/orders/confirm"
import { rateLimit } from "@/lib/rate-limit"

/**
 * POST /api/orders/verify  { reference }
 *
 * Respaldo del webhook: cuando el comprador vuelve a /gracias tras pagar,
 * verificamos su pago DIRECTAMENTE contra Mercado Pago (con el access token) y,
 * si está aprobado, confirmamos el pedido. Así el pedido queda confirmado
 * aunque el webhook se pierda o llegue tarde.
 *
 * Es seguro exponerlo: no confía en el cliente. Solo confirma si Mercado Pago
 * reporta un pago APROBADO para esa referencia. La confirmación es idempotente.
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { id: "order-verify", limit: 20, windowMs: 60_000 })
  if (limited) return limited

  try {
    const { reference } = await req.json().catch(() => ({}))
    if (!reference || typeof reference !== "string") {
      return NextResponse.json({ error: "Falta la referencia" }, { status: 400 })
    }

    const approved = await findApprovedPayment(reference)
    if (!approved) {
      // Aún no aprobado (o método asíncrono en proceso): no es un error.
      return NextResponse.json({ status: "pending" })
    }

    const db = createServerClient()
    const result = await confirmPaidOrder(db, reference, { email: approved.email }, { paidAmount: approved.amount })
    return NextResponse.json({ status: result.status })
  } catch (err) {
    console.error("[orders/verify]", err)
    return NextResponse.json({ error: "Error verificando el pago" }, { status: 500 })
  }
}
