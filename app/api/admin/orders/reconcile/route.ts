import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { isAdmin } from "@/lib/admin-auth"
import { findApprovedPayment } from "@/lib/mercadopago"
import { confirmPaidOrder } from "@/lib/orders/confirm"

/**
 * POST /api/admin/orders/reconcile
 *
 * Reconciliación de pagos: recorre los pedidos "pending" y le pregunta a
 * Mercado Pago (con el access token) si cada uno tiene un pago APROBADO. Los que
 * sí, se confirman (idempotente, mismas acciones que el webhook: stock, correos,
 * alerta admin). Es la red de seguridad definitiva: recupera cualquier pago que
 * el webhook no haya confirmado, sin tocar los intentos realmente abandonados.
 */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    return NextResponse.json({ error: "MERCADOPAGO_ACCESS_TOKEN no configurado" }, { status: 503 })
  }

  const db = createServerClient()
  const { data: pendings, error } = await db
    .from("orders")
    .select("stripe_session_id")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(300)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let checked = 0
  let confirmed = 0
  const confirmedRefs: string[] = []

  for (const o of pendings ?? []) {
    const reference = o.stripe_session_id as string | null
    if (!reference) continue
    checked++
    try {
      const approved = await findApprovedPayment(reference)
      if (!approved) continue
      const result = await confirmPaidOrder(db, reference, { email: approved.email })
      if (result.status === "confirmed") {
        confirmed++
        confirmedRefs.push(reference)
      }
    } catch (e) {
      console.error(`[reconcile] error con ${reference}:`, e)
    }
  }

  return NextResponse.json({ checked, confirmed, stillPending: checked - confirmed, confirmedRefs })
}
