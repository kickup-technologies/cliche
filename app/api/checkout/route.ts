import { NextRequest, NextResponse } from "next/server"
import { MercadoPagoConfig, Preference } from "mercadopago"
import { supabase, createServerClient } from "@/lib/supabase"
import { getSupabaseServer } from "@/lib/supabase/server"
import { rateLimit } from "@/lib/rate-limit"
import { parseVariantId, TIER_BY_ID } from "@/lib/pricing"

const FREE_SHIPPING = 300_000
const SHIPPING_COST = 20_500

type IncomingItem = { product_id: string; quantity: number; name?: string }
type IncomingPack = {
  type: "pack"
  tier: string
  quantity: number
  name?: string
  components: Array<{ product_id: string; quantity: number }>
}

export async function POST(req: NextRequest) {
  // Anti-spam: máx. 10 intentos de checkout por IP por minuto
  const limited = rateLimit(req, { id: "checkout", limit: 10, windowMs: 60_000 })
  if (limited) return limited

  try {
    const { items, email, discount_code, customer_name, customer_phone, customer_id_number, shipping_address } =
      await req.json()

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Carrito vacío" }, { status: 400 })
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://clichecolombia.com"

    if (!accessToken) {
      return NextResponse.json({ error: "Configuración de pago incompleta" }, { status: 500 })
    }

    const db = createServerClient()

    // Si hay sesión iniciada (cookies), vinculamos el pedido a la cuenta para
    // su historial. Se obtiene del servidor (seguro), no se confía en el cliente.
    let userId: string | null = null
    try {
      const sb = await getSupabaseServer()
      const { data: auth } = await sb.auth.getUser()
      userId = auth.user?.id ?? null
    } catch { /* invitado */ }

    // ── Separar líneas normales de "kits personalizados" (type:"pack") ──
    const rawItems = items as Array<IncomingItem | IncomingPack>
    const packLines: IncomingPack[] = rawItems
      .filter((i): i is IncomingPack => (i as IncomingPack)?.type === "pack")
      .map((p) => ({
        type: "pack",
        tier: String(p.tier),
        quantity: Math.max(1, Math.min(99, Math.floor(Number(p.quantity) || 1))),
        name: p.name,
        components: Array.isArray(p.components)
          ? p.components
              .map((c) => ({
                product_id: String(c.product_id),
                quantity: Math.max(1, Math.min(99, Math.floor(Number(c.quantity) || 1))),
              }))
              .filter((c) => c.product_id)
          : [],
      }))

    // ── Normalizar items normales (solo product_id + quantity son de fiar) ──
    const requested = rawItems
      .filter((i) => (i as IncomingPack)?.type !== "pack")
      .map((i) => ({
        product_id: String((i as IncomingItem).product_id),
        quantity: Math.max(1, Math.min(99, Math.floor(Number((i as IncomingItem).quantity) || 1))),
      }))
      .filter((i) => i.product_id)

    if (requested.length === 0 && packLines.length === 0) {
      return NextResponse.json({ error: "Carrito inválido" }, { status: 400 })
    }

    // ── Precios REALES desde la base de datos (nunca confiar en el cliente) ──
    // Los productos son de lectura pública (RLS products_public_read), así que
    // usamos el cliente ANÓNIMO para validarlos.
    const ids = [
      ...new Set([
        ...requested.map((i) => parseVariantId(i.product_id).baseId),
        ...packLines.flatMap((p) => p.components.map((c) => c.product_id)),
      ]),
    ]
    const { data: products, error: prodErr } = await supabase
      .from("products")
      .select("id, name, slug, price, stock, is_active")
      .in("id", ids)

    if (prodErr || !products || products.length === 0) {
      console.error("[checkout] validación de productos falló:", prodErr?.message)
      return NextResponse.json({ error: "No se pudieron validar los productos" }, { status: 400 })
    }
    const productMap = new Map(products.map((p) => [p.id, p]))

    // ── Acumular frascos necesarios por producto (normal + packs) para validar
    //    stock de forma agregada y evitar sobreventa al combinar líneas. ──
    const needed = new Map<string, number>()
    const addNeed = (pid: string, qty: number) => needed.set(pid, (needed.get(pid) || 0) + qty)

    let subtotal = 0
    type PackComp = { product_id: string; name: string; quantity: number }
    type SafeItem =
      | { kind: "unit"; product_id: string; quantity: number; name: string; price: number }
      | { kind: "pack"; tier: string; quantity: number; name: string; price: number; components: PackComp[] }
    const safeItems: SafeItem[] = []

    // Líneas normales (unidad o kit del mismo aroma)
    for (const it of requested) {
      const { baseId, tier } = parseVariantId(it.product_id)
      const p = productMap.get(baseId)
      if (!p || p.is_active === false) {
        return NextResponse.json({ error: "Uno de los productos ya no está disponible" }, { status: 400 })
      }
      addNeed(p.id, it.quantity * tier.units)
      const linePrice = tier.id === "unit" ? Number(p.price) : tier.price
      const lineName = tier.units > 1 ? `${p.name} — Kit x${tier.units}` : p.name
      subtotal += linePrice * it.quantity
      safeItems.push({ kind: "unit", product_id: p.id, quantity: it.quantity, name: lineName, price: linePrice })
    }

    // Líneas de kit personalizado (varios aromas, precio FIJO del tier).
    // Se guarda AGRUPADO (con sus componentes) para que el admin vea los frascos
    // elegidos; el webhook descuenta stock recorriendo los componentes.
    for (const pack of packLines) {
      const tier = TIER_BY_ID[pack.tier]
      if (!tier || tier.units < 2) {
        return NextResponse.json({ error: "Kit personalizado inválido" }, { status: 400 })
      }
      const totalUnits = pack.components.reduce((s, c) => s + c.quantity, 0)
      // El nº de frascos elegidos DEBE coincidir con el tamaño del kit (anti-manipulación)
      if (totalUnits !== tier.units) {
        return NextResponse.json(
          { error: `El kit personalizado debe tener exactamente ${tier.units} frascos` },
          { status: 400 }
        )
      }
      const components: PackComp[] = []
      for (const c of pack.components) {
        const p = productMap.get(c.product_id)
        if (!p || p.is_active === false) {
          return NextResponse.json({ error: "Uno de los aromas del kit ya no está disponible" }, { status: 400 })
        }
        addNeed(p.id, c.quantity * pack.quantity)
        components.push({ product_id: p.id, name: p.name, quantity: c.quantity })
      }
      safeItems.push({
        kind: "pack",
        tier: tier.id,
        quantity: pack.quantity,
        name: `Kit personalizado x${tier.units}`,
        price: tier.price,
        components,
      })
      // El precio del pack es FIJO por tier, sin importar los aromas escogidos.
      subtotal += tier.price * pack.quantity
    }

    // ── Validación de stock AGREGADA ──
    for (const [pid, qty] of needed) {
      const p = productMap.get(pid)
      if (p && typeof p.stock === "number" && p.stock < qty) {
        return NextResponse.json({ error: `Stock insuficiente para ${p?.name ?? "un producto"}` }, { status: 409 })
      }
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
    // Producto de prueba de pagos (slug "prueba"): exento de envío para que el
    // total sea EXACTAMENTE su precio ($1.000) al validar la pasarela.
    const shippingExempt =
      safeItems.length > 0 &&
      safeItems.every((it) => it.kind === "unit" && productMap.get(it.product_id)?.slug === "prueba")
    const shipping = subtotal >= FREE_SHIPPING || shippingExempt ? 0 : SHIPPING_COST
    const total = Math.max(0, subtotal + shipping - discount_amount)

    const reference = `cliche_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

    // Guardar orden pendiente con montos AUTORITATIVOS del servidor.
    // Esto SÍ requiere service-role (RLS orders_service_only). Si la
    // SUPABASE_SERVICE_ROLE_KEY está mal en producción, este insert falla y la
    // orden nunca aparece en el panel de admin → registramos el error explícito
    // para poder diagnosticarlo (antes el .catch silencioso lo ocultaba).
    try {
      const { error: orderErr } = await db.from("orders").insert({
        stripe_session_id: reference,
        user_id: userId,
        total: Math.round(total),
        status: "pending",
        items: safeItems.map((i) =>
          i.kind === "pack"
            ? { kind: "pack", product_id: `pack-${i.tier}`, name: i.name, tier: i.tier, quantity: i.quantity, price: i.price, components: i.components }
            : { product_id: i.product_id, quantity: i.quantity, name: i.name, price: i.price }
        ),
        customer_email: email || null,
        customer_name: customer_name || null,
        customer_phone: customer_phone || null,
        customer_id_number: typeof customer_id_number === "string" ? customer_id_number.slice(0, 20) : null,
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

    // ── Crear preferencia de pago en Mercado Pago (Checkout Pro) ──
    // Cobramos el total AUTORITATIVO del servidor en UNA sola línea, así el
    // monto cobrado es exactamente el que calculamos (con envío y descuento).
    try {
      const client = new MercadoPagoConfig({ accessToken })
      const pref = await new Preference(client).create({
        body: {
          items: [
            {
              id: reference,
              title: `Pedido Cliché (${safeItems.length} producto${safeItems.length > 1 ? "s" : ""})`,
              quantity: 1,
              unit_price: Math.round(total),
              currency_id: "COP",
            },
          ],
          payer: {
            ...(email ? { email } : {}),
            ...(customer_name ? { name: customer_name } : {}),
            ...(customer_phone ? { phone: { number: customer_phone.replace(/\D/g, "") } } : {}),
          },
          // external_reference = nuestra referencia → así el webhook encuentra el pedido.
          external_reference: reference,
          back_urls: {
            success: `${appUrl}/gracias?reference=${reference}`,
            failure: `${appUrl}/gracias?reference=${reference}&status=failed`,
            pending: `${appUrl}/gracias?reference=${reference}`,
          },
          auto_return: "approved",
          notification_url: `${appUrl}/api/webhooks/mercadopago`,
          statement_descriptor: "CLICHE",
        },
      })
      const url = pref.init_point
      if (!url) throw new Error("Mercado Pago no devolvió init_point")
      return NextResponse.json({ url })
    } catch (e) {
      console.error("[checkout] error creando preferencia Mercado Pago:", e)
      return NextResponse.json({ error: "No se pudo iniciar el pago. Intenta de nuevo." }, { status: 502 })
    }
  } catch (err) {
    console.error("[checkout] error:", err)
    return NextResponse.json({ error: "Error procesando el pago. Intenta de nuevo." }, { status: 500 })
  }
}
