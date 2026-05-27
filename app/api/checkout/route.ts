import { NextRequest, NextResponse } from "next/server"
import { createServerClient, supabase as anonClient } from "@/lib/supabase"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  try {
    const { items, discountCode } = await req.json()

    // Usar service role si está disponible, si no caer al anon client
    const db = (() => { try { return createServerClient() } catch { return anonClient } })()
    const productIds = items.map((i: { product_id: string }) => i.product_id)

    const { data: products, error } = await db
      .from("products")
      .select("id, name, price, stock, image_url")
      .in("id", productIds)

    if (error || !products?.length) {
      console.error("[checkout] products query error:", JSON.stringify(error), "ids:", JSON.stringify(productIds))
      return NextResponse.json({
        error: "Productos no encontrados",
        debug: { supabaseError: error?.message, code: error?.code, ids: productIds }
      }, { status: 400 })
    }

    // Verificar stock
    for (const item of items) {
      const product = products.find((p) => p.id === item.product_id)
      if (!product) return NextResponse.json({ error: "Producto no existe" }, { status: 400 })
      if (product.stock < item.quantity) {
        return NextResponse.json({ error: `Stock insuficiente: ${product.name}` }, { status: 400 })
      }
    }

    // Descuento
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

    // Total en COP (pesos)
    const totalCOP = items.reduce((sum: number, item: { product_id: string; quantity: number }) => {
      const product = products.find((p) => p.id === item.product_id)!
      const price = Math.round(product.price * (1 - discountPercent / 100))
      return sum + price * item.quantity
    }, 0)

    // Wompi usa centavos (1 COP = 100 centavos)
    const amountInCents = totalCOP * 100
    const reference = `cliche_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const currency = "COP"
    const integritySecret = process.env.WOMPI_INTEGRITY_SECRET!
    const publicKey = process.env.WOMPI_PUBLIC_KEY!
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://cliche-nine.vercel.app"

    // Firma de integridad SHA256(reference + amount_in_cents + currency + integrity_secret)
    const integrityString = `${reference}${amountInCents}${currency}${integritySecret}`
    const signature = crypto.createHash("sha256").update(integrityString).digest("hex")

    // Guardar orden pendiente para recuperarla en el webhook
    await supabase.from("orders").insert({
      stripe_session_id: reference, // reutilizamos este campo para la referencia de Wompi
      total: totalCOP,
      status: "pending",
      items,
      discount_code: discountCode || null,
    })

    // URL de checkout Wompi
    const params = new URLSearchParams({
      "public-key": publicKey,
      currency,
      "amount-in-cents": String(amountInCents),
      reference,
      "signature:integrity": signature,
      "redirect-url": `${appUrl}/gracias?reference=${reference}`,
    })

    const checkoutUrl = `https://checkout.wompi.co/p/?${params.toString()}`
    return NextResponse.json({ url: checkoutUrl })
  } catch (err) {
    console.error("Checkout error:", err)
    return NextResponse.json({ error: "Error creando checkout" }, { status: 500 })
  }
}
