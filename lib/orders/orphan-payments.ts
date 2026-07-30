import type { SupabaseClient } from "@supabase/supabase-js"
import { Payment } from "mercadopago"
import { mpClient } from "@/lib/mercadopago"
import { sendAdminOrderAlert } from "@/lib/mailer"

/**
 * BARRIDO INVERSO (MP → BD): detecta pagos APROBADOS en Mercado Pago que NO
 * tienen pedido en nuestra base de datos y los registra como pedido visible
 * en el panel + alerta por correo a la admin.
 *
 * El flujo normal (checkout web) crea el pedido ANTES de cobrar, así que un
 * pago sin pedido local significa dinero entrando por fuera de la web: un
 * link de pago creado a mano en MP, el canal viejo, o un pedido borrado por
 * error. Antes esos pagos eran invisibles (incidente del pago de $74.000 del
 * 2026-07-20, detectado solo en auditoría manual). Ahora quedan plasmados.
 *
 * Idempotente: el pedido sintético se guarda con referencia `mp_<paymentId>`
 * (o la referencia externa real si existe), y antes de registrar se comprueba
 * que ni esa referencia ni la externa existan ya en orders.
 */

// Solo pagos desde esta fecha: todo lo anterior ya fue auditado a mano el
// 2026-07-30 (los "sin pedido local" viejos son del Shopify anterior).
const SWEEP_SINCE_MS = Date.parse("2026-07-30T00:00:00.000Z")

export type MpPaymentLike = {
  id?: number | string
  status?: string
  date_created?: string
  external_reference?: string | null
  transaction_amount?: number
  payment_method_id?: string
  payer?: { email?: string | null; first_name?: string | null; last_name?: string | null; phone?: { number?: string | null } | null } | null
  metadata?: Record<string, unknown> | null
}

export type OrphanSummary = { scanned: number; registered: string[] }

/**
 * Registra UN pago aprobado sin pedido local: crea el pedido sintético
 * (status "confirmed" → visible en la vista principal del panel) y avisa a la
 * admin por correo. Devuelve la referencia registrada, o null si ya existía.
 */
export async function registerOrphanPayment(
  db: SupabaseClient,
  p: MpPaymentLike,
): Promise<string | null> {
  if (!p.id || p.status !== "approved") return null

  // La cuenta de Mercado Pago es COMPARTIDA con "Bienestar" (otro negocio del
  // mismo dueño, tienda Shopify bienestarbycliche.com). Sus ventas llegan con
  // metadata.platform = "Shopify" y tienen su propio panel/operación allá:
  // registrarlas aquí mezclaría las ventas de los dos negocios en el panel de
  // Cliché. Se omiten (confirmado con el pago $74.000 del 2026-07-20).
  const platform = p.metadata?.platform
  if (typeof platform === "string" && platform.toLowerCase() === "shopify") {
    console.log(`[orphan-payments] pago ${p.id} es de Shopify/Bienestar — se omite (otro negocio)`)
    return null
  }

  const syntheticRef = `mp_${p.id}`
  const externalRef = p.external_reference || null

  // ¿Ya hay pedido con la referencia externa o ya registramos este pago?
  const refs = [syntheticRef, ...(externalRef ? [externalRef] : [])]
  const { data: existing, error: qErr } = await db
    .from("orders")
    .select("id")
    .in("stripe_session_id", refs)
    .limit(1)
  if (qErr) throw new Error(qErr.message)
  if (existing && existing.length > 0) return null

  const amount = Number(p.transaction_amount) || 0
  const payerName =
    [p.payer?.first_name, p.payer?.last_name].filter(Boolean).join(" ") || null
  const item = {
    product_id: "pago-externo",
    name: `⚠️ Pago recibido en Mercado Pago SIN pedido web (${p.payment_method_id || "método desconocido"}${externalRef ? `, ref ${externalRef}` : ""})`,
    quantity: 1,
    price: amount,
  }

  const { error: insErr } = await db.from("orders").insert({
    stripe_session_id: syntheticRef,
    status: "confirmed",
    total: Math.round(amount),
    items: [item],
    customer_email: p.payer?.email || null,
    customer_name: payerName,
    customer_phone: p.payer?.phone?.number || null,
    // No es un pedido web real: sin correo de reseñas a los 7 días.
    review_email_sent: true,
  })
  if (insErr) throw new Error(insErr.message)

  console.error(`[orphan-payments] PAGO SIN PEDIDO registrado: ${syntheticRef} (${amount} COP)`)
  try {
    await sendAdminOrderAlert({
      reference: syntheticRef,
      total: amount,
      customer_name: payerName,
      customer_email: p.payer?.email || null,
      customer_phone: p.payer?.phone?.number || null,
      shipping_address: null,
      items: [item],
    })
  } catch (err) {
    console.error("[orphan-payments] alerta admin falló:", err)
  }
  return syntheticRef
}

/** Recorre los últimos pagos de MP y registra todos los huérfanos nuevos. */
export async function sweepOrphanPayments(db: SupabaseClient): Promise<OrphanSummary> {
  const client = mpClient()
  if (!client) return { scanned: 0, registered: [] }

  const res = await new Payment(client).search({
    options: { sort: "date_created", criteria: "desc", limit: 50 },
  })
  const recent = (res.results || []).filter(
    (p) =>
      p.status === "approved" &&
      p.date_created &&
      Date.parse(p.date_created) >= SWEEP_SINCE_MS,
  )

  const registered: string[] = []
  for (const p of recent) {
    try {
      const ref = await registerOrphanPayment(db, p as MpPaymentLike)
      if (ref) registered.push(ref)
    } catch (err) {
      console.error(`[orphan-payments] error con pago ${p.id}:`, err)
    }
  }
  return { scanned: recent.length, registered }
}
