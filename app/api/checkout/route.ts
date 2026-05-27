import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  try {
    const { items, total } = await req.json()

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
        items: items.map((i: { product_id: string; quantity: number }) => ({
          product_id: i.product_id,
          quantity: i.quantity,
        })),
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

    const checkoutUrl = `https://checkout.wompi.co/p/?${params.toString()}`
    return NextResponse.json({ url: checkoutUrl })
  } catch (err) {
    console.error("[checkout] error:", err)
    return NextResponse.json({ error: "Error procesando el pago. Intenta de nuevo." }, { status: 500 })
  }
}
