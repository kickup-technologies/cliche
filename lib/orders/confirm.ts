import type { SupabaseClient } from "@supabase/supabase-js"
import { sendOrderConfirmation, sendAdminOrderAlert } from "@/lib/mailer"
import { sendPurchaseCAPI } from "@/lib/capi-server"

export type ConfirmResult =
  | { status: "confirmed"; reference: string }
  | { status: "already"; reference: string }
  | { status: "not_found"; reference: string }

/**
 * Confirma un pedido pendiente a partir de su referencia (stripe_session_id) una
 * vez que un pago quedó APROBADO en Mercado Pago.
 *
 * IDEMPOTENTE y a prueba de carreras: el paso de confirmación es un UPDATE
 * condicional (`.eq("status","pending")`). Solo UN llamador logra el cambio; los
 * demás (webhook + verificación al volver del pago + reconciliación del panel)
 * ven `status: "already"` y NO vuelven a descontar stock ni reenvían correos.
 *
 * Esto reemplaza al patrón anterior "leer → comprobar → escribir" del webhook,
 * que tenía una ventana de doble procesamiento si Mercado Pago reenviaba la
 * notificación mientras otro proceso confirmaba el mismo pedido.
 */
export async function confirmPaidOrder(
  db: SupabaseClient,
  reference: string,
  payer?: { email?: string | null; name?: string | null },
  opts?: { paidAmount?: number | null },
): Promise<ConfirmResult> {
  const { data: order } = await db
    .from("orders")
    .select("*")
    .eq("stripe_session_id", reference)
    .single()

  if (!order) return { status: "not_found", reference }
  if (order.status !== "pending") return { status: "already", reference }

  // Defensa en profundidad: el monto pagado DEBE coincidir con el total del
  // pedido. Hoy siempre coincide (la preferencia se crea server-side con el
  // total autoritativo y la referencia es única/aleatoria), pero si esa premisa
  // se rompiera (referencia reutilizada, preferencia manipulada) lo dejamos
  // registrado para reconciliar. No bloquea: el pago ya está aprobado en MP.
  if (
    opts?.paidAmount != null &&
    Number.isFinite(opts.paidAmount) &&
    Math.abs(Number(opts.paidAmount) - Number(order.total)) > 1
  ) {
    console.error(
      `[AMOUNT-MISMATCH] Pedido ${reference}: pagado ${opts.paidAmount} vs total ${order.total}. Revisar manualmente.`,
    )
  }

  // Preferimos lo que el cliente tecleó en el checkout; el pagador de MP como respaldo.
  const customerEmail = order.customer_email || payer?.email || null
  const customerName = order.customer_name || payer?.name || null

  // 1. Confirmar la orden — UPDATE condicional (solo si sigue "pending").
  //    Si `updated` vuelve vacío, otro proceso la confirmó primero → salimos.
  const { data: updated } = await db
    .from("orders")
    .update({ status: "confirmed", customer_email: customerEmail, customer_name: customerName })
    .eq("stripe_session_id", reference)
    .eq("status", "pending")
    .select("id")

  if (!updated || updated.length === 0) {
    return { status: "already", reference }
  }

  // 2. Descontar stock (kits: cada frasco que los compone).
  //    decrement_stock es atómico y devuelve -1 si NO había suficiente (dos
  //    compras concurrentes de la última unidad). Recogemos esos faltantes para
  //    avisar al admin: el pedido YA está pagado, así que confirma igual, pero
  //    el dueño necesita saber que vendió más de lo que tenía. Todo el bloque va
  //    en try/catch: un error transitorio del RPC no debe abortar los correos ni
  //    la alerta de pedido (el pago ya ocurrió).
  const oversold: Array<{ product_id: string; qty: number }> = []
  const decrement = async (product_id: string, qty: number) => {
    if (!product_id || qty <= 0) return
    const { data: result, error } = await db.rpc("decrement_stock", {
      p_product_id: product_id,
      p_quantity: qty,
    })
    if (error) throw error
    if (typeof result === "number" && result < 0) oversold.push({ product_id, qty })
  }
  try {
    for (const item of order.items || []) {
      if (item?.kind === "pack" && Array.isArray(item.components)) {
        const packQty = Number(item.quantity) || 1
        for (const c of item.components) {
          await decrement(c.product_id, (Number(c.quantity) || 0) * packQty)
        }
      } else if (item?.product_id) {
        // Los kits del mismo aroma guardan `units` (frascos por kit): un Kit x6
        // debe descontar quantity * 6 frascos, no 1. Las órdenes viejas sin
        // `units` siguen descontando quantity tal cual (retrocompatible).
        const units = Number(item.units) || 1
        await decrement(item.product_id, (Number(item.quantity) || 0) * units)
      }
    }
  } catch (err) {
    // No abortamos: el pago ya se hizo. Registramos para que el dueño lo revise.
    console.error(`[confirm] fallo descontando stock del pedido ${reference}:`, err)
  }
  if (oversold.length > 0) {
    // Señal clara en logs (Vercel) para reconciliar inventario manualmente.
    console.error(
      `[OVERSELL] Pedido ${reference} confirmado con stock insuficiente:`,
      JSON.stringify(oversold),
    )
  }

  // 3. Registrar uso del código de descuento.
  //    El checkout valida el "un solo uso" contra el correo de la CUENTA
  //    autenticada — la redención debe registrarse bajo ESE mismo correo. Si se
  //    registrara con el del formulario (customer_email), bastaría teclear un
  //    correo distinto en cada compra para reutilizar el código sin límite.
  if (order.discount_code) {
    try {
      let redemptionEmail = customerEmail
      if (order.user_id) {
        try {
          const { data: authUser } = await db.auth.admin.getUserById(order.user_id)
          redemptionEmail = authUser?.user?.email || redemptionEmail
        } catch { /* fallback al correo del pedido */ }
      }
      if (redemptionEmail) {
        const { data: discountCode } = await db
          .from("discount_codes").select("id").eq("code", order.discount_code).single()
        if (discountCode) {
          await db.from("code_redemptions").upsert(
            { code_id: discountCode.id, customer_email: redemptionEmail, order_reference: reference },
            { onConflict: "code_id,customer_email", ignoreDuplicates: true }
          )
          await db.rpc("increment_uses_count", { p_code_id: discountCode.id })
        }
      }
    } catch { /* no bloquear */ }
  }

  // 4. Suscribir email + 5. Email de confirmación
  if (customerEmail) {
    try {
      await db.from("subscribers").upsert(
        { email: customerEmail, source: "purchase" },
        { onConflict: "email", ignoreDuplicates: true }
      )
    } catch { /* silent */ }
    try {
      await sendOrderConfirmation(customerEmail, {
        id: reference,
        total: order.total,
        items: order.items || [],
        customerName,
        shippingAddress: order.shipping_address || null,
        discountCode: order.discount_code || null,
        discountAmount: order.discount_amount || 0,
      })
    } catch { /* no bloquear */ }
  }

  // 5b. Purchase server-side a la Conversions API de Meta: garantiza la
  //     conversión aunque el comprador nunca vuelva a /gracias (PSE/app móvil).
  //     event_id = referencia del pedido → Meta deduplica con el pixel del
  //     navegador si el cliente sí aterriza en /gracias. Nunca bloquea el flujo.
  try {
    await sendPurchaseCAPI({
      reference,
      total: Number(order.total) || 0,
      items: order.items || [],
      customer_email: customerEmail,
      customer_phone: order.customer_phone || null,
    })
  } catch { /* no bloquear */ }

  // 6. Alerta al administrador
  try {
    await sendAdminOrderAlert({
      reference,
      total: order.total,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: order.customer_phone || null,
      shipping_address: order.shipping_address || null,
      items: order.items || [],
    })
  } catch { /* no bloquear */ }

  return { status: "confirmed", reference }
}
