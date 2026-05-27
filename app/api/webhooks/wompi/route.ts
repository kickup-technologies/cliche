import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import crypto from "crypto"
import { sendOrderConfirmation, sendReviewRequestEmail, sendAdminOrderAlert } from "@/lib/mailer"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Verificar firma del evento
    const eventsSecret = process.env.WOMPI_EVENTS_SECRET
    if (eventsSecret) {
      const checksum = req.headers.get("x-event-checksum")
      if (checksum) {
        const expected = crypto
          .createHash("sha256")
          .update(`${body.event}${body.timestamp}${eventsSecret}`)
          .digest("hex")
        if (checksum !== expected) {
          return NextResponse.json({ error: "Firma inválida" }, { status: 401 })
        }
      }
    }

    const event = body.event
    const transaction = body.data?.transaction

    if (event === "transaction.updated" && transaction?.status === "APPROVED") {
      const reference = transaction.reference
      const supabase = createServerClient()

      // Buscar orden pendiente por referencia
      const { data: order } = await supabase
        .from("orders")
        .select("*")
        .eq("stripe_session_id", reference)
        .single()

      // Solo procesar si está pendiente (evitar duplicados)
      if (order && order.status === "pending") {
        const customerEmail = transaction.customer_email || order.customer_email || null
        const customerName = transaction.customer_data?.full_name || order.customer_name || null

        // ── 1. Actualizar orden a confirmada ──────────────────────────
        await supabase
          .from("orders")
          .update({
            status: "confirmed",
            customer_email: customerEmail,
            customer_name: customerName,
          })
          .eq("stripe_session_id", reference)

        // ── 2. Descontar stock ────────────────────────────────────────
        for (const item of order.items || []) {
          await supabase.rpc("decrement_stock", {
            p_product_id: item.product_id,
            p_quantity: item.quantity,
          })
        }

        // ── 3. Registrar uso del código de descuento ──────────────────
        if (order.discount_code && customerEmail) {
          try {
            const { data: discountCode } = await supabase
              .from("discount_codes")
              .select("id")
              .eq("code", order.discount_code)
              .single()

            if (discountCode) {
              // Registrar canje (1 uso por email)
              await supabase.from("code_redemptions").upsert(
                {
                  code_id: discountCode.id,
                  customer_email: customerEmail,
                  order_reference: reference,
                },
                { onConflict: "code_id,customer_email", ignoreDuplicates: true }
              )

              // Incrementar contador de usos
              await supabase.rpc("increment_uses_count", { p_code_id: discountCode.id })
            }
          } catch {
            // No bloquear si falla
          }
        }

        // ── 4. Suscribir email ────────────────────────────────────────
        if (customerEmail) {
          try {
            await supabase.from("subscribers").upsert(
              { email: customerEmail, source: "purchase" },
              { onConflict: "email", ignoreDuplicates: true }
            )
          } catch { /* silent */ }

          // ── 5. Email de confirmación ──────────────────────────────
          await sendOrderConfirmation(customerEmail, {
            id: reference,
            total: order.total,
            items: order.items || [],
          })

          // ── 6. Email de reseña (best-effort) ─────────────────────
          try {
            const firstName = customerName?.split(" ")[0] || "Cliente"
            await sendReviewRequestEmail(customerEmail, firstName, order.items || [])
          } catch { /* no bloquear */ }
        }

        // ── 7. Alerta al administrador ────────────────────────────
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
        } catch { /* no bloquear checkout */ }
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error("[wompi webhook]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
