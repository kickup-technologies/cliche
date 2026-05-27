import { NextRequest, NextResponse } from "next/server"
import { getStripe } from "@/lib/stripe"
import { createServerClient } from "@/lib/supabase"
import { sendOrderConfirmation, sendReviewRequestEmail } from "@/lib/mailer"

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get("stripe-signature")!

  let event
  try {
    event = getStripe().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: "Webhook inválido" }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as import("stripe").Stripe.Checkout.Session
    const supabase = createServerClient()

    const items = JSON.parse(session.metadata?.items || "[]")

    // Guardar orden
    await supabase.from("orders").insert({
      stripe_session_id: session.id,
      customer_email: session.customer_email,
      total: session.amount_total,
      status: "paid",
      items,
      discount_code: session.metadata?.discount_code || null,
    })

    // Descontar stock
    for (const item of items) {
      await supabase.rpc("decrement_stock", {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
      })
    }

    // Suscribir email si no existe
    if (session.customer_email) {
      await supabase.from("subscribers").upsert(
        { email: session.customer_email, source: "purchase" },
        { onConflict: "email", ignoreDuplicates: true }
      )

      // Email de confirmación
      await sendOrderConfirmation(session.customer_email, {
        id: session.id,
        total: session.amount_total || 0,
        items,
      })

      // Email de solicitud de reseña (se envía después de la compra)
      try {
        const customerName = (session.customer_details as { name?: string } | null)?.name?.split(" ")[0] || "Cliente"
        await sendReviewRequestEmail(session.customer_email, customerName, items)
      } catch {
        // No bloquear el webhook si falla el email de reseña
      }
    }
  }

  return NextResponse.json({ received: true })
}
