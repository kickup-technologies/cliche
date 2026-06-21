import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import crypto from "crypto"
import { sendOrderConfirmation, sendAdminOrderAlert } from "@/lib/mailer"

/** Resuelve una ruta tipo "transaction.amount_in_cents" dentro de un objeto */
function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>(
    (acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined),
    obj
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // ── Verificación de firma (formato oficial Wompi) ──────────────────
    // Sin el secreto NO se procesa: de lo contrario cualquiera podría POSTear
    // un "transaction.updated APPROVED" falso y confirmar pedidos sin pagar.
    const eventsSecret = process.env.WOMPI_EVENTS_SECRET
    if (!eventsSecret) {
      console.error("[wompi webhook] WOMPI_EVENTS_SECRET no configurado — rechazando evento")
      return NextResponse.json({ error: "Webhook no configurado" }, { status: 503 })
    }

    const signature = body.signature as { checksum?: string; properties?: string[] } | undefined
    const checksum = signature?.checksum || req.headers.get("x-event-checksum")
    const properties = signature?.properties || []

    if (!checksum || properties.length === 0) {
      return NextResponse.json({ error: "Firma ausente" }, { status: 401 })
    }

    // Wompi: concatena los valores de las propiedades indicadas + timestamp + secret
    const concatenated = properties
      .map((p) => String(getByPath(body.data, p) ?? ""))
      .join("")
    const expected = crypto
      .createHash("sha256")
      .update(`${concatenated}${body.timestamp}${eventsSecret}`)
      .digest("hex")

    if (checksum.toLowerCase() !== expected.toLowerCase()) {
      return NextResponse.json({ error: "Firma inválida" }, { status: 401 })
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
        // Preferimos lo que el cliente tecleó en el checkout (es el destinatario
        // del envío). Solo usamos los datos de Wompi como respaldo si faltan.
        const customerEmail = order.customer_email || transaction.customer_email || null
        const customerName = order.customer_name || transaction.customer_data?.full_name || null

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
        // Los kits personalizados se guardan agrupados (kind:"pack"): se
        // descuenta cada frasco que los compone. El resto, su product_id directo.
        for (const item of order.items || []) {
          if (item?.kind === "pack" && Array.isArray(item.components)) {
            const packQty = Number(item.quantity) || 1
            for (const c of item.components) {
              await supabase.rpc("decrement_stock", {
                p_product_id: c.product_id,
                p_quantity: (Number(c.quantity) || 0) * packQty,
              })
            }
          } else if (item?.product_id) {
            await supabase.rpc("decrement_stock", {
              p_product_id: item.product_id,
              p_quantity: item.quantity,
            })
          }
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
          // NOTA: el email de reseña ya NO se envía aquí (era prematuro).
          // Lo dispara el cron /api/cron/review-emails 7 días después.
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
