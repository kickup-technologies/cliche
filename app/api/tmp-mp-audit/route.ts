import { NextRequest, NextResponse } from "next/server"
import { MercadoPagoConfig, Payment } from "mercadopago"

/**
 * TEMP — auditoría de intentos de pago en Mercado Pago (se borra tras usar).
 *
 * Devuelve TODOS los pagos (aprobados, rechazados, cancelados) de los últimos
 * 30 días + la búsqueda por referencia de los pedidos pendientes, para
 * distinguir "el cliente intentó y MP rechazó" de "el cliente nunca intentó".
 * Protegido con CRON_SECRET, igual que los crons.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!accessToken) {
    return NextResponse.json({ error: "Sin token MP" }, { status: 503 })
  }

  const client = new MercadoPagoConfig({ accessToken })
  const payment = new Payment(client)

  const slim = (p: Record<string, unknown>) => ({
    id: p.id,
    status: p.status,
    status_detail: p.status_detail,
    external_reference: p.external_reference,
    date_created: p.date_created,
    transaction_amount: p.transaction_amount,
    payment_method_id: p.payment_method_id,
    payment_type_id: p.payment_type_id,
    payer_email: (p.payer as { email?: string } | undefined)?.email ?? null,
    payer_name: (() => {
      const payer = p.payer as { first_name?: string | null; last_name?: string | null } | undefined
      return [payer?.first_name, payer?.last_name].filter(Boolean).join(" ") || null
    })(),
    platform: (p.metadata as { platform?: string } | undefined)?.platform ?? null,
  })

  try {
    // Detalle COMPLETO de un pago puntual (metadata, additional_info.items,
    // description…): con los productos se sabe de qué tienda salió el pedido.
    const id = req.nextUrl.searchParams.get("id")
    if (id) {
      const full = await payment.get({ id })
      return NextResponse.json({ payment: full })
    }

    // Últimos pagos de la cuenta, cualquier estado, más recientes primero.
    const recent = await payment.search({
      options: { sort: "date_created", criteria: "desc", limit: 50 },
    })

    // Búsqueda puntual por las referencias de los pedidos pendientes.
    const refs = (req.nextUrl.searchParams.get("refs") || "").split(",").filter(Boolean)
    const byRef: Record<string, unknown[]> = {}
    for (const ref of refs) {
      const res = await payment.search({ options: { external_reference: ref } })
      byRef[ref] = (res.results || []).map((p) => slim(p as Record<string, unknown>))
    }

    return NextResponse.json({
      recent: (recent.results || []).map((p) => slim(p as Record<string, unknown>)),
      byRef,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
