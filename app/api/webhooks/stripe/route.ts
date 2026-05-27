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

      // Prooffactor — notificar compra para mostrar social proof en tiempo real
      try {
        const pfSiteId = process.env.NEXT_PUBLIC_PROOFFACTOR_SITE_ID
        if (pfSiteId) {
          const customerDetails = session.customer_details as { name?: string; address?: { city?: string; country?: string } } | null
          const firstName = customerDetails?.name?.split(" ")[0] || "Alguien"
          const city = customerDetails?.address?.city || ""
          const country = customerDetails?.address?.country || "CO"
          // Get first product name from metadata
          const firstItem = items[0]
          const productName = firstItem ? `Cliché ${firstItem.product_id?.slice(0, 8)}` : "Cliché Aromas"

          await fetch("https://app.prooffactor.com/api/v1/events", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Site-Id": pfSiteId,
            },
            body: JSON.stringify({
              event_type: "purchase",
              first_name: firstName,
              city,
              country,
              product_title: productName,
              timestamp: new Date().toISOString(),
            }),
          })
        }
      } catch {
        // Never block the webhook for analytics
      }
    }
  }

  return NextResponse.json({ received: true })
}
