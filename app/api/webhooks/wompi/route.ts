import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import crypto from "crypto"
import { sendOrderConfirmation, sendReviewRequestEmail } from "@/lib/mailer"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Verificar firma del evento (opcional pero recomendado)
    const eventsSecret = process.env.WOMPI_EVENTS_SECRET
    if (eventsSecret) {
      const checksum = req.headers.get("x-event-checksum")
      if (checksum) {
        const timestamp = body.timestamp
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

      if (order && order.status !== "paid") {
        const customerEmail =
          transaction.customer_email ||
          transaction.customer_data?.legal_id_type === "CC"
            ? null
            : transaction.customer_email

        // Actualizar orden a pagada
        await supabase
          .from("orders")
          .update({
            status: "paid",
            customer_email: transaction.customer_email || null,
            customer_name: transaction.customer_data?.full_name || null,
          })
          .eq("stripe_session_id", reference)

        // Descontar stock
        for (const item of order.items || []) {
          await supabase.rpc("decrement_stock", {
            p_product_id: item.product_id,
            p_quantity: item.quantity,
          })
        }

        const email = transaction.customer_email
        if (email) {
          // Suscribir email
          await supabase.from("subscribers").upsert(
            { email, source: "purchase" },
            { onConflict: "email", ignoreDuplicates: true }
          )

          // Email de confirmación
          await sendOrderConfirmation(email, {
            id: reference,
            total: transaction.amount_in_cents / 100,
            items: order.items || [],
          })

          // Email de reseña
          try {
            const firstName =
              transaction.customer_data?.full_name?.split(" ")[0] || "Cliente"
            await sendReviewRequestEmail(email, firstName, order.items || [])
          } catch {
            // No bloquear si falla
          }
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error("[wompi webhook]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
