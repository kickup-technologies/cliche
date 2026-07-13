import { NextRequest, NextResponse } from "next/server"
import { MercadoPagoConfig, Payment } from "mercadopago"
import { createServerClient } from "@/lib/supabase"
import { isAdmin } from "@/lib/admin-auth"

/**
 * GET /api/admin/orders/diagnose
 *
 * Diagnóstico de pagos: lista los últimos intentos de pago registrados en
 * Mercado Pago (aprobados Y rechazados) con su `status_detail` — la razón
 * EXACTA por la que MP rechazó cada tarjeta (cc_rejected_high_risk,
 * cc_rejected_call_for_authorize, collector no puede pagarse a sí mismo, etc.).
 * Cruza cada pago con el pedido local (por external_reference) para dar
 * contexto. Solo lectura; no cambia nada.
 */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!accessToken) {
    return NextResponse.json({ error: "MERCADOPAGO_ACCESS_TOKEN no configurado" }, { status: 503 })
  }

  try {
    const client = new MercadoPagoConfig({ accessToken })
    const res = await new Payment(client).search({
      options: { sort: "date_created", criteria: "desc", limit: 30 },
    })

    const payments = (res.results || []).map((p) => ({
      id: p.id,
      fecha: p.date_created,
      estado: p.status,
      detalle: p.status_detail,
      metodo: p.payment_method_id,
      tipo: p.payment_type_id,
      monto: p.transaction_amount,
      referencia: p.external_reference ?? null,
      payer_email: p.payer?.email ?? null,
    }))

    // Contexto local: nombre del cliente por referencia
    const refs = [...new Set(payments.map((p) => p.referencia).filter(Boolean))] as string[]
    const nombrePorRef = new Map<string, string | null>()
    if (refs.length > 0) {
      const db = createServerClient()
      const { data: orders } = await db
        .from("orders")
        .select("stripe_session_id, customer_name, status")
        .in("stripe_session_id", refs)
      for (const o of orders || []) nombrePorRef.set(o.stripe_session_id, `${o.customer_name ?? "?"} (pedido ${o.status})`)
    }

    return NextResponse.json({
      total: payments.length,
      pagos: payments.map((p) => ({
        ...p,
        pedido: p.referencia ? nombrePorRef.get(p.referencia) ?? "sin pedido local" : "sin referencia",
      })),
    })
  } catch (err) {
    console.error("[diagnose]", err)
    return NextResponse.json({ error: "Error consultando Mercado Pago" }, { status: 500 })
  }
}
