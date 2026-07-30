import type { SupabaseClient } from "@supabase/supabase-js"
import { findApprovedPayment } from "@/lib/mercadopago"
import { confirmPaidOrder } from "@/lib/orders/confirm"
import { sweepOrphanPayments, type OrphanSummary } from "@/lib/orders/orphan-payments"

export type ReconcileSummary = {
  checked: number
  confirmed: number
  stillPending: number
  confirmedRefs: string[]
  /** Consultas a MP que fallaron (token inválido, API caída). Si errors > 0,
   *  el cron responde 500 → el workflow de GitHub se pone rojo → correo. */
  errors: number
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
  let errors = 0
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
      errors++
      console.error(`[reconcile] error con ${reference}:`, e)
    }
  }

  return { checked, confirmed, stillPending: checked - confirmed, confirmedRefs, errors }
}

export type SafetyNetSummary = ReconcileSummary & { orphans: OrphanSummary }

/**
 * Red de seguridad COMPLETA de pagos, en ambos sentidos:
 *  - ida (BD→MP): confirma pedidos pending cuyo pago sí está aprobado;
 *  - inversa (MP→BD): registra pagos aprobados que no tienen pedido local
 *    (links de pago manuales, canales viejos) para que se vean en el panel
 *    y lleguen por correo a la admin. Nada de dinero queda invisible.
 * La usan el cron horario, la reconciliación oportunista y el botón del panel.
 */
export async function runPaymentSafetyNet(db: SupabaseClient): Promise<SafetyNetSummary> {
  const summary = await reconcilePendingOrders(db)
  let orphans: OrphanSummary = { scanned: 0, registered: [] }
  try {
    orphans = await sweepOrphanPayments(db)
  } catch (err) {
    // Un barrido caído también es señal de alarma (token MP roto, API caída):
    // se suma a errors para que el cron responda 500 y GitHub avise.
    summary.errors++
    console.error("[reconcile] barrido inverso falló:", err)
  }
  return { ...summary, orphans }
}
