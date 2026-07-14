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
): Promise<ConfirmResult> {
  const { data: order } = await db
    .from("orders")
    .select("*")
    .eq("stripe_session_id", reference)
    .single()

  if (!order) return { status: "not_found", reference }
  if (order.status !== "pending") return { status: "already", reference }

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

  // 2. Descontar stock (kits: cada frasco que los compone)
  for (const item of order.items || []) {
    if (item?.kind === "pack" && Array.isArray(item.components)) {
      const packQty = Number(item.quantity) || 1
      for (const c of item.components) {
        await db.rpc("decrement_stock", {
          p_product_id: c.product_id,
          p_quantity: (Number(c.quantity) || 0) * packQty,
        })
      }
    } else if (item?.product_id) {
      // Los kits del mismo aroma guardan `units` (frascos por kit): un Kit x6
      // debe descontar quantity * 6 frascos, no 1. Las órdenes viejas sin
      // `units` siguen descontando quantity tal cual (retrocompatible).
      const units = Number(item.units) || 1
      await db.rpc("decrement_stock", {
        p_product_id: item.product_id,
        p_quantity: (Number(item.quantity) || 0) * units,
      })
    }
  }

  // 3. Registrar uso del código de descuento
  if (order.discount_code && customerEmail) {
    try {
      const { data: discountCode } = await db
        .from("discount_codes").select("id").eq("code", order.discount_code).single()
      if (discountCode) {
        await db.from("code_redemptions").upsert(
          { code_id: discountCode.id, customer_email: customerEmail, order_reference: reference },
          { onConflict: "code_id,customer_email", ignoreDuplicates: true }
        )
        await db.rpc("increment_uses_count", { p_code_id: discountCode.id })
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
      await sendOrderConfirmation(customerEmail, { id: reference, total: order.total, items: order.items || [] })
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
