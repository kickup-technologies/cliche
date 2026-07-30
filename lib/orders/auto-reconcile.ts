import { after } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { reconcilePendingOrders } from "@/lib/orders/reconcile"

/**
 * Reconciliación OPORTUNISTA de pagos, a caballo del tráfico normal.
 *
 * El plan Hobby de Vercel solo permite crons diarios, y un pago asíncrono
 * (PSE/botón Bancolombia) cuyo webhook se pierda no puede esperar 24 horas.
 * Solución: cualquier visita al catálogo dispara, DESPUÉS de responder
 * (next/server `after`, no añade latencia al cliente), una reconciliación
 * contra Mercado Pago — como máximo una vez cada RECONCILE_EVERY_MS.
 *
 * El candado anti-estampida es un UPDATE condicional sobre site_settings
 * (`payments_last_reconcile_at`): solo la petición que logra actualizar el
 * timestamp ejecuta la reconciliación; las demás salen gratis. Los ISO-8601
 * se comparan lexicográficamente, así que `.lt()` sobre texto es correcto.
 */
const RECONCILE_EVERY_MS = 30 * 60 * 1000
const SETTINGS_KEY = "payments_last_reconcile_at"

export function scheduleOpportunisticReconcile(): void {
  try {
    after(async () => {
      try {
        if (!process.env.MERCADOPAGO_ACCESS_TOKEN) return
        const db = createServerClient()
        const cutoff = new Date(Date.now() - RECONCILE_EVERY_MS).toISOString()
        const { data: won } = await db
          .from("site_settings")
          .update({ value: new Date().toISOString() })
          .eq("key", SETTINGS_KEY)
          .lt("value", cutoff)
          .select("key")
        if (!won || won.length === 0) return // ya corrió hace poco (u otra instancia ganó)

        const summary = await reconcilePendingOrders(db)
        if (summary.confirmed > 0) {
          // Señal fuerte en logs: el webhook perdió pagos y el respaldo los rescató.
          console.error(
            `[auto-reconcile] RESCATE: ${summary.confirmed} pedido(s) pagados estaban sin confirmar:`,
            summary.confirmedRefs.join(", "),
          )
        }
      } catch (err) {
        console.error("[auto-reconcile]", err)
      }
    })
  } catch {
    /* after() fuera de request scope: nunca romper la respuesta por esto */
  }
}
