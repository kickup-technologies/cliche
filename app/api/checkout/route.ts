import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  try {
    const { items, total, email, discount_code, discount_amount, customer_name, customer_phone, shipping_address } = await req.json()

    if (!items?.length || !total || total <= 0) {
      return NextResponse.json({ error: "Carrito vacío o total inválido" }, { status: 400 })
    }

    const publicKey = process.env.WOMPI_PUBLIC_KEY
    const integritySecret = process.env.WOMPI_INTEGRITY_SECRET
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://cliche-nine.vercel.app"

    if (!publicKey || !integritySecret) {
      return NextResponse.json({ error: "Configuración de pago incompleta" }, { status: 500 })
    }

    // Wompi usa centavos (1 COP = 100 centavos)
    const amountInCents = Math.round(total) * 100
    const reference = `cliche_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const currency = "COP"

    // Firma de integridad SHA256(reference + amount_in_cents + currency + integrity_secret)
    const integrityString = `${reference}${amountInCents}${currency}${integritySecret}`
    const signature = crypto.createHash("sha256").update(integrityString).digest("hex")

    // Guardar referencia en Supabase (best-effort, no bloquea si falla)
    try {
      const { createServerClient, supabase: anonClient } = await import("@/lib/supabase")
      const db = (() => { try { return createServerClient() } catch { return anonClient } })()
      await db.from("orders").insert({
        stripe_session_id: reference,
        total: Math.round(total),
        status: "pending",
        items: items.map((i: { product_id: string; quantity: number; name?: string }) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          name: i.name,
        })),
        customer_email: email || null,
        customer_name: customer_name || null,
        customer_phone: customer_phone || null,
        shipping_address: shipping_address || null,
        discount_code: discount_code || null,
        discount_amount: discount_amount || 0,
      })
    } catch {
      // No bloquear el checkout si falla el registro
      console.error("[checkout] could not save pending order")
    }

    // URL de checkout Wompi
    const params = new URLSearchParams({
      "public-key": publicKey,
      currency,
      "amount-in-cents": String(amountInCents),
      reference,
      "signature:integrity": signature,
      "redirect-url": `${appUrl}/gracias?reference=${reference}`,
    })
    if (email) params.set("customer-email", email)
    // Pre-fill Wompi widget with customer data
    if (customer_name) params.set("customer-data:full-name", customer_name)
    if (customer_phone) {
      params.set("customer-data:phone-number", customer_phone.replace(/\D/g, "").slice(-10))
      params.set("customer-data:phone-number-prefix", "+57")
    }
    // Pre-fill shipping address in Wompi
    if (shipping_address) {
      if (shipping_address.address) params.set("shipping-address:address-line-1", shipping_address.address)
      if (shipping_address.city) params.set("shipping-address:city", shipping_address.city)
      if (shipping_address.department) params.set("shipping-address:region", shipping_address.department)
      if (customer_name) params.set("shipping-address:name", customer_name)
      if (customer_phone) params.set("shipping-address:phone-number", customer_phone.replace(/\D/g, "").slice(-10))
    }

    const checkoutUrl = `https://checkout.wompi.co/p/?${params.toString()}`
    return NextResponse.json({ url: checkoutUrl })
  } catch (err) {
    console.error("[checkout] error:", err)
    return NextResponse.json({ error: "Error procesando el pago. Intenta de nuevo." }, { status: 500 })
  }
}
