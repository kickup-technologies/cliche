import { NextRequest, NextResponse } from "next/server"
import { MercadoPagoConfig, Payment } from "mercadopago"
import { isAdmin } from "@/lib/admin-auth"

/**
 * TEMP — GET /api/admin/orders/payment-detail?id=<paymentId>
 * Devuelve el objeto COMPLETO de un pago de Mercado Pago (payer,
 * additional_info, metadata) para investigar pagos externos. Solo admin.
 * Se elimina tras usar (auditoría del pago $74.000 del 2026-07-20).
 */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!accessToken) return NextResponse.json({ error: "Sin token MP" }, { status: 503 })

  const id = req.nextUrl.searchParams.get("id")
  if (!id || !/^\d+$/.test(id)) return NextResponse.json({ error: "id inválido" }, { status: 400 })

  try {
    const payment = await new Payment(new MercadoPagoConfig({ accessToken })).get({ id })
    return NextResponse.json(payment)
  } catch (err) {
    console.error("[payment-detail]", err)
    return NextResponse.json({ error: "Error consultando MP" }, { status: 500 })
  }
}
