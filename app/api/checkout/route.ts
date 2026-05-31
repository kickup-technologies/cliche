import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { createServerClient } from "@/lib/supabase"
import { rateLimit } from "@/lib/rate-limit"

const FREE_SHIPPING = 300_000
const SHIPPING_COST = 15_000

type IncomingItem = { product_id: string; quantity: number; name?: string }

export async function POST(req: NextRequest) {
  // Anti-spam: máx. 10 intentos de checkout por IP por minuto
  const limited = rateLimit(req, { id: "checkout", limit: 10, windowMs: 60_000 })
  if (limited) return limited

  try {
    const { items, email, discount_code, customer_name, customer_phone, shipping_address } =
      await req.json()

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Carrito vacío" }, { status: 400 })
    }

    const publicKey = process.env.WOMPI_PUBLIC_KEY
    const integritySecret = process.env.WOMPI_INTEGRITY_SECRET
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://cliche-nine.vercel.app"

    if (!publicKey || !integritySecret) {
      return NextResponse.json({ error: "Configuración de pago incompleta" }, { status: 500 })
    }

    const db = createServerClient()

    // ── Normalizar items del cliente (solo product_id + quantity son de fiar) ──
    const requested = (items as IncomingItem[])
      .map((i) => ({
        product_id: String(i.product_id),
        quantity: Math.max(1, Math.min(99, Math.floor(Number(i.quantity) || 1))),
      }))
      .filter((i) => i.product_id)

    if (requested.length === 0) {
      return NextResponse.json({ error: "Carrito inválido" }, { status: 400 })
    }

    // ── Precios REALES desde la base de datos (nunca confiar en el cliente) ──
    const ids = [...new Set(requested.map((i) => i.product_id))]
    const { data: products, error: prodErr } = await db
      .from("products")
      .select("id, name, price, stock, is_active")
      .in("id", ids)

    if (prodErr || !products || products.length === 0) {
      return NextResponse.json({ error: "No se pudieron validar los productos" }, { status: 400 })
    }
    const productMap = new Map(products.map((p) => [p.id, p]))

    // ── Construir items autoritativos y subtotal server-side ──
    let subtotal = 0
    const safeItems: Array<{ product_id: string; quantity: number; name: string; price: number }> = []
    for (const it of requested) {
      const p = productMap.get(it.product_id)
      if (!p || p.is_active === false) {
        return NextResponse.json(
          { error: "Uno de los productos ya no está disponible" },
          { status: 400 }
        )
      }
      if (typeof p.stock === "number" && p.stock < it.quantity) {
        return NextResponse.json(
          { error: `Stock insuficiente para ${p.name}` },
          { status: 409 }
        )
      }
      subtotal += Number(p.price) * it.quantity
      safeItems.push({ product_id: p.id, quantity: it.quantity, name: p.name, price: Number(p.price) })
    }

    if (subtotal <= 0) {
      return NextResponse.json({ error: "Total inválido" }, { status: 400 })
    }

    // ── Validar código de descuento server-side (replica /api/discount/validate) ──
    let discount_amount = 0
    let validatedCode: string | null = null
    if (discount_code) {
      const code = String(discount_code).toUpperCase().trim()
      const { data: discount } = await db
        .from("discount_codes")
        .select("*")
        .eq("code", code)
        .single()

      const now = new Date()
      const usable =
        discount &&
        discount.is_active &&
        (!discount.expires_at || new Date(discount.expires_at) >= now) &&
        (discount.max_uses === null || discount.uses_count < discount.max_uses)

      let alreadyUsed = false
      if (usable && email) {
        const { data: redemption } = await db
          .from("code_redemptions")
          .select("id")
          .eq("code_id", discount.id)
          .eq("customer_email", email)
          .single()
        alreadyUsed = !!redemption
      }

      if (usable && !alreadyUsed) {
        if (discount.type === "percentage") {
          discount_amount = Math.round((subtotal * discount.value) / 100)
        } else {
          discount_amount = Math.min(discount.value, subtotal)
        }
        validatedCode = code
      }
      // Si el código no es válido, simplemente se ignora (no se aplica descuento)
    }

    // ── Total final calculado en el servidor ──
    const shipping = subtotal >= FREE_SHIPPING ? 0 : SHIPPING_COST
    const total = Math.max(0, subtotal + shipping - discount_amount)

    // Wompi usa centavos (1 COP = 100 centavos)
    const amountInCents = Math.round(total) * 100
    const reference = `cliche_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const currency = "COP"

    // Firma de integridad SHA256(reference + amount_in_cents + currency + integrity_secret)
    const integrityString = `${reference}${amountInCents}${currency}${integritySecret}`
    const signature = crypto.createHash("sha256").update(integrityString).digest("hex")

    // Guardar orden pendiente con montos AUTORITATIVOS del servidor
    try {
      await db.from("orders").insert({
        stripe_session_id: reference,
        total: Math.round(total),
        status: "pending",
        items: safeItems.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          name: i.name,
        })),
        customer_email: email || null,
        customer_name: customer_name || null,
        customer_phone: customer_phone || null,
        shipping_address: shipping_address || null,
        discount_code: validatedCode,
        discount_amount,
      })
    } catch {
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
    if (customer_name) params.set("customer-data:full-name", customer_name)
    if (customer_phone) {
      params.set("customer-data:phone-number", customer_phone.replace(/\D/g, "").slice(-10))
      params.set("customer-data:phone-number-prefix", "+57")
    }
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
