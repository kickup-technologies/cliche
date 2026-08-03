import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { sendPaymentFailedAlert } from "@/lib/mailer"
import { rateLimit } from "@/lib/rate-limit"

/**
 * POST /api/orders/payment-failed  { reference }
 *
 * El comprador volvió de Mercado Pago con el pago FALLIDO (/gracias?status=
 * failed). Dejamos rastro permanente en la BD (payment_failed_at — los logs
 * de Vercel solo viven 1 h en plan Hobby) y avisamos al admin por correo con
 * los datos del cliente para rescatar la venta.
 *
 * Nació de la auditoría 2026-08-03: 4 clientes reales (18–28 jul) intentaron
 * pagar, MP no registró ni un intento, y nadie se enteró hasta que la dueña
 * preguntó. Con esto, cada intento fallido genera una alerta accionable.
 *
 * Seguro de exponer: solo marca pedidos PENDING existentes y la alerta sale
 * UNA sola vez por pedido (UPDATE condicional sobre payment_failed_at IS NULL
 * — sin carrera aunque el cliente recargue /gracias). No revela si una
 * referencia existe (204 siempre).
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { id: "payment-failed", limit: 10, windowMs: 60_000 })
  if (limited) return limited

  try {
    const { reference } = await req.json().catch(() => ({}))
    // Solo referencias con el formato propio del checkout web.
    if (typeof reference !== "string" || !/^cliche_\d+_[a-z0-9]{5}$/.test(reference)) {
      return new NextResponse(null, { status: 204 })
    }

    const db = createServerClient()
    // Marca única e idempotente: si otra pestaña/recarga ya lo marcó, el
    // UPDATE no devuelve fila y no se duplica la alerta.
    const { data: marked } = await db
      .from("orders")
      .update({ payment_failed_at: new Date().toISOString() })
      .eq("stripe_session_id", reference)
      .eq("status", "pending")
      .is("payment_failed_at", null)
      .select("stripe_session_id, total, customer_name, customer_email, customer_phone")
      .maybeSingle()

    if (marked) {
      await sendPaymentFailedAlert({
        reference,
        total: Number(marked.total) || 0,
        customer_name: marked.customer_name,
        customer_email: marked.customer_email,
        customer_phone: marked.customer_phone,
      })
    }

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error("[orders/payment-failed]", err)
    return new NextResponse(null, { status: 204 })
  }
}
