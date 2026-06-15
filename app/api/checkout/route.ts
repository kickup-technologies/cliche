import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { supabase, createServerClient } from "@/lib/supabase"
import { rateLimit } from "@/lib/rate-limit"
import { parseVariantId } from "@/lib/pricing"

const FREE_SHIPPING = 300_000
const SHIPPING_COST = 20_500

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
    // Los productos son de lectura pública (RLS products_public_read), así que
    // usamos el cliente ANÓNIMO para validarlos. Antes esto usaba service-role
    // y si la SUPABASE_SERVICE_ROLE_KEY estaba mal configurada, la validación
    // fallaba con "No se pudieron validar los productos" aunque la tienda
    // mostraba los productos sin problema. Con el cliente anónimo la validación
    // es robusta frente a una service-role rota.
    const ids = [...new Set(requested.map((i) => parseVariantId(i.product_id).baseId))]
    const { data: products, error: prodErr } = await supabase
      .from("products")
      .select("id, name, price, stock, is_active")
      .in("id", ids)

    if (prodErr || !products || products.length === 0) {
      console.error("[checkout] validación de productos falló:", prodErr?.message)
      return NextResponse.json({ error: "No se pudieron validar los productos" }, { status: 400 })
    }
    const productMap = new Map(products.map((p) => [p.id, p]))

    // ── Construir items autoritativos y subtotal server-side ──
    let subtotal = 0
    const safeItems: Array<{ product_id: string; quantity: number; name: string; price: number }> = []
    for (const it of requested) {
      const { baseId, tier } = parseVariantId(it.product_id)
      const p = productMap.get(baseId)
      if (!p || p.is_active === false) {
        return NextResponse.json(
          { error: "Uno de los productos ya no está disponible" },
          { status: 400 }
        )
      }
      // un kit consume tier.units frascos por cada unidad pedida
      const unitsNeeded = it.quantity * tier.units
      if (typeof p.stock === "number" && p.stock < unitsNeeded) {
        return NextResponse.json(
          { error: `Stock insuficiente para ${p.name}` },
          { status: 409 }
        )
      }
      // precio FIJO por tier (kit) o el de la BD para el unitario
      const linePrice = tier.id === "unit" ? Number(p.price) : tier.price
      const lineName = tier.units > 1 ? `${p.name} — Kit x${tier.units}` : p.name
      subtotal += linePrice * it.quantity
      safeItems.push({ product_id: p.id, quantity: it.quantity, name: lineName, price: linePrice })
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

    // Guardar orden pendiente con montos AUTORITATIVOS del servidor.
    // Esto SÍ requiere service-role (RLS orders_service_only). Si la
    // SUPABASE_SERVICE_ROLE_KEY está mal en producción, este insert falla y la
    // orden nunca aparece en el panel de admin → registramos el error explícito
    // para poder diagnosticarlo (antes el .catch silencioso lo ocultaba).
    try {
      const { error: orderErr } = await db.from("orders").insert({
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
      if (orderErr) {
        console.error("[checkout] no se pudo guardar la orden pendiente:", orderErr.message,
          "— revisa SUPABASE_SERVICE_ROLE_KEY en Vercel")
      }
    } catch (e) {
      console.error("[checkout] excepción guardando orden pendiente:", e)
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
