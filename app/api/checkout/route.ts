import { NextRequest, NextResponse } from "next/server"
import { getStripe, toStripeAmount } from "@/lib/stripe"
import { createServerClient } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    const { items, discountCode, customerEmail } = await req.json()
    // items = [{ product_id, quantity }]

    const supabase = createServerClient()

    // Obtener precios reales desde la DB (nunca confiar en el frontend)
    const productIds = items.map((i: { product_id: string }) => i.product_id)
    const { data: products, error } = await supabase
      .from("products")
      .select("id, name, price, stock, image_url")
      .in("id", productIds)
      .eq("is_active", true)

    if (error || !products?.length) {
      return NextResponse.json({ error: "Productos no encontrados" }, { status: 400 })
    }

    // Verificar stock
    for (const item of items) {
      const product = products.find((p) => p.id === item.product_id)
      if (!product) return NextResponse.json({ error: `Producto no existe` }, { status: 400 })
      if (product.stock < item.quantity) {
        return NextResponse.json({ error: `Stock insuficiente: ${product.name}` }, { status: 400 })
      }
    }

    // Aplicar descuento si hay código
    let discountPercent = 0
    if (discountCode) {
      const { data: promo } = await supabase
        .from("promotions")
        .select("discount_percent")
        .eq("code", discountCode.toUpperCase())
        .eq("is_active", true)
        .single()
      if (promo) discountPercent = promo.discount_percent
    }

    // Crear line items para Stripe
    const lineItems = items.map((item: { product_id: string; quantity: number }) => {
      const product = products.find((p) => p.id === item.product_id)!
      const finalPrice = Math.round(product.price * (1 - discountPercent / 100))

      return {
        price_data: {
          currency: "cop",
          unit_amount: toStripeAmount(finalPrice),
          product_data: {
            name: product.name,
            images: product.image_url ? [`${process.env.NEXT_PUBLIC_APP_URL}${product.image_url}`] : [],
          },
        },
        quantity: item.quantity,
      }
    })

    // Crear sesión de Stripe Checkout
    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      customer_email: customerEmail,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/gracias?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/?cancelado=true`,
      metadata: {
        discount_code: discountCode || "",
        items: JSON.stringify(items),
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error("Checkout error:", err)
    return NextResponse.json({ error: "Error creando checkout" }, { status: 500 })
  }
}
