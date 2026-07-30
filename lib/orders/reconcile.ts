import type { SupabaseClient } from "@supabase/supabase-js"
import { findApprovedPayment } from "@/lib/mercadopago"
import { confirmPaidOrder } from "@/lib/orders/confirm"

export type ReconcileSummary = {
  checked: number
  confirmed: number
  stillPending: number
  confirmedRefs: string[]
}

/**
 * Recorre los pedidos "pending" y le pregunta a Mercado Pago (con el access
 * token) si cada uno tiene un pago APROBADO. Los que sí, se confirman con las
 * mismas acciones que el webhook (stock, correos, alerta admin) de forma
 * idempotente. Es la red de seguridad definitiva contra webhooks perdidos.
 *
 * La usan el botón "Reconciliar pagos" del panel y el cron horario
 * /api/cron/reconcile — así una venta pagada nunca depende de que un humano
 * pulse un botón para existir.
 */
export async function reconcilePendingOrders(db: SupabaseClient): Promise<ReconcileSummary> {
  const { data: pendings, error } = await db
    .from("orders")
    .select("stripe_session_id")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(300)

  if (error) throw new Error(error.message)

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
      const result = await confirmPaidOrder(db, reference, { email: approved.email }, { paidAmount: approved.amount })
      if (result.status === "confirmed") {
        confirmed++
        confirmedRefs.push(reference)
      }
    } catch (e) {
      console.error(`[reconcile] error con ${reference}:`, e)
    }
  }

  return { checked, confirmed, stillPending: checked - confirmed, confirmedRefs }
}
