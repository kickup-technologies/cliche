"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCart } from "@/context/cart-context"
import { useAuth } from "@/context/auth-context"
import { useCAPI } from "@/lib/use-capi"
import { useSiteSettings } from "@/lib/use-site-settings"
import { SHIPPING_COST, parseFreeShippingThreshold } from "@/lib/pricing"
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, Lock, Truck, Leaf, RotateCcw, Tag, ChevronDown, ChevronUp, Mail, RefreshCw, Phone, MapPin, User, ShieldCheck } from "lucide-react"

function fmt(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n)
}

function splitNum(n: number): string {
  return n.toLocaleString("es-CO")
}

export default function CheckoutPage() {
  const { items, removeItem, updateQuantity } = useCart()
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [backUrl, setBackUrl] = useState("/catalogo")
  const [mobileResumenOpen, setMobileResumenOpen] = useState(false)
  const [customerEmail, setCustomerEmail] = useState("")
  const [couponCode, setCouponCode] = useState("")
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null)
  // Del cupón se guarda tipo+valor (no un monto fijo): el monto se DERIVA del
  // subtotal vigente más abajo, así marcar/desmarcar artículos o cambiar
  // cantidades recalcula el descuento y la pantalla siempre coincide con lo
  // que cobra el servidor (antes quedaba congelado y se cobraba de más).
  const [appliedDiscount, setAppliedDiscount] = useState<{ type: string; value: number } | null>(null)
  const [appliedCode, setAppliedCode] = useState<string | null>(null)
  // Ley 1581/Decreto 1377: la autorización de tratamiento de datos debe ser
  // previa y expresa — sin marcar el checkbox no se puede pagar.
  const [acceptedPolicies, setAcceptedPolicies] = useState(false)
  // Shipping address
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerIdNumber, setCustomerIdNumber] = useState("")
  const [addressLine, setAddressLine] = useState("")
  const [addressCity, setAddressCity] = useState("")
  const [addressDept, setAddressDept] = useState("")
  const [addressNotes, setAddressNotes] = useState("")
  const [livePrices, setLivePrices] = useState<Record<string, number>>({})
  const router = useRouter()
  const { track } = useCAPI()
  const { user } = useAuth()
  const siteSettings = useSiteSettings()

  // Con sesión: el correo se fija al de la cuenta (los códigos se validan y
  // cuentan contra ESE correo, así el "un solo uso por cuenta" es infalsificable).
  useEffect(() => {
    if (user?.email) setCustomerEmail(user.email)
  }, [user])

  // Precios VIGENTES desde la BD, por si cambiaron después de que el ítem entró
  // al carrito (p. ej. el producto de prueba, que pasó a $1.000). El servidor ya
  // cobra el precio real; esto solo alinea lo que MUESTRA la pantalla.
  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data: Array<{ id: string; price: number }>) => {
        if (!Array.isArray(data)) return
        const m: Record<string, number> = {}
        for (const p of data) if (p?.id) m[p.id] = p.price
        setLivePrices(m)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const stored = sessionStorage.getItem("checkout-back-url")
    if (stored) {
      setBackUrl(stored)
    } else if (document.referrer && !document.referrer.includes("/checkout")) {
      try {
        const ref = new URL(document.referrer).pathname + new URL(document.referrer).search
        sessionStorage.setItem("checkout-back-url", ref)
        setBackUrl(ref)
      } catch {}
    }
    return () => { sessionStorage.removeItem("checkout-back-url") }
  }, [])

  useEffect(() => {
    setSelected(prev => {
      const next = { ...prev }
      items.forEach(i => { if (!(i.product.id in next)) next[i.product.id] = true })
      return next
    })
  }, [items])

  const selectedItems = items.filter((i) => selected[i.product.id])
  // Precio a mostrar: unidades → precio vigente de la BD; kits (id con "::") →
  // su precio fijo de tier. Así la pantalla coincide con lo que cobra el servidor.
  const priceOf = (it: { product: { id: string; price: number } }) =>
    it.product.id.includes("::") ? it.product.price : (livePrices[it.product.id] ?? it.product.price)
  const subtotal = selectedItems.reduce((s, i) => s + priceOf(i) * i.quantity, 0)
  // Umbral de envío gratis desde el setting del admin (misma fuente que el
  // servidor de checkout), con fallback. Así lo mostrado coincide con lo cobrado.
  const FREE_SHIPPING = parseFreeShippingThreshold(siteSettings.free_shipping_threshold)
  // Producto de prueba de pagos: exento de envío (total exacto = su precio).
  const onlyTestProduct = selectedItems.length > 0 && selectedItems.every((i) => i.product.slug === "prueba")
  const freeShipping = subtotal >= FREE_SHIPPING || onlyTestProduct
  const shipping = freeShipping ? 0 : subtotal > 0 ? SHIPPING_COST : 0
  // Réplica exacta de la fórmula del servidor (/api/checkout): el descuento
  // aplica SOLO a los productos (topado al subtotal) — NUNCA al envío, que se
  // cobra completo siempre que no aplique el envío gratis.
  const discountAmount = appliedDiscount
    ? Math.min(
        appliedDiscount.type === "percentage"
          ? Math.round((subtotal * appliedDiscount.value) / 100)
          : appliedDiscount.value,
        subtotal
      )
    : 0
  const total = Math.max(0, subtotal - discountAmount) + shipping
  const pct = Math.min(100, Math.round((subtotal / FREE_SHIPPING) * 100))

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    setCouponError(null)
    setCouponSuccess(null)
    try {
      const res = await fetch("/api/discount/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, email: customerEmail, subtotal }),
      })
      const data = await res.json()
      if (data.valid) {
        setAppliedDiscount({ type: data.type, value: Number(data.value) || 0 })
        setAppliedCode(couponCode.toUpperCase().trim())
        setCouponSuccess(`Descuento aplicado: ${data.type === "percentage" ? `${data.value}%` : fmt(data.value)} de descuento`)
      } else {
        setCouponError(data.error || "Código inválido")
        setAppliedDiscount(null)
        setAppliedCode(null)
      }
    } catch {
      setCouponError("Error al validar el código")
    } finally {
      setCouponLoading(false)
    }
  }

  async function handlePay() {
    if (!selectedItems.length) return
    // Validar campos obligatorios de envío
    if (!customerName.trim() || !customerPhone.trim() || !addressLine.trim() || !addressCity.trim() || !addressDept.trim()) {
      setError("Completa todos los datos de envío antes de continuar.")
      return
    }
    if (!customerEmail.trim() || !customerEmail.includes("@")) {
      setError("Ingresa un correo electrónico válido.")
      return
    }
    // Cédula obligatoria: Mercado Pago la cruza con el banco emisor y sin ella
    // su antifraude bloquea pagos de clientes reales (auditoría 2026-08-03:
    // 3 de 4 intentos fallidos iban sin cédula). Además se usa para la factura.
    if (customerIdNumber.replace(/\D/g, "").length < 5) {
      setError("Ingresa tu cédula o NIT: el banco la necesita para aprobar el pago.")
      return
    }
    if (!acceptedPolicies) {
      setError("Debes autorizar el tratamiento de tus datos personales y aceptar los Términos para continuar.")
      return
    }
    setIsLoading(true)
    setError(null)
    // ── Meta Pixel + CAPI: AddPaymentInfo (datos completos, va a pagar) ──
    // Advanced Matching con email/teléfono → mejor match rate en retargeting
    track({
      event_name: "AddPaymentInfo",
      custom_data: {
        currency: "COP",
        value: total,
        content_ids: selectedItems.map((i) => i.product.id),
        content_type: "product",
        num_items: selectedItems.reduce((n, i) => n + i.quantity, 0),
      },
      user_data: {
        raw_email: customerEmail.trim(),
        ...(customerPhone.trim() && { raw_phone: customerPhone.trim() }),
      },
    })
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: selectedItems.map((i) =>
            i.pack
              ? {
                  type: "pack",
                  tier: i.pack.tier,
                  quantity: i.quantity,
                  name: i.product.name,
                  components: i.pack.components.map((c) => ({ product_id: c.product_id, quantity: c.quantity })),
                }
              : { product_id: i.product.id, quantity: i.quantity, unit_price: priceOf(i), name: i.product.name }
          ),
          total,
          email: customerEmail,
          discount_code: appliedCode,
          discount_amount: discountAmount,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          customer_id_number: customerIdNumber.trim() || null,
          shipping_address: {
            address: addressLine.trim(),
            city: addressCity.trim(),
            department: addressDept.trim(),
            notes: addressNotes.trim() || null,
          },
        }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else if (res.status === 400 && appliedCode && /c[oó]digo/i.test(data.error ?? "")) {
        // El servidor rechazó el CUPÓN (expiró, ya se usó o la sesión caducó
        // entre aplicar y pagar). No redirigimos: mostramos el error junto al
        // campo del código Y junto al botón Pagar (el usuario está mirando el
        // panel de pago, no la columna del cupón) y retiramos el descuento para
        // que el total mostrado vuelva a coincidir con lo que se cobraría.
        setCouponError(data.error)
        setCouponSuccess(null)
        setAppliedDiscount(null)
        setAppliedCode(null)
        setError(`${data.error} El total se actualizó sin el descuento.`)
      } else {
        setError(data.error || "Error al procesar. Intenta de nuevo.")
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center px-6 text-center">
        <ShoppingBag className="w-10 h-10 text-[#A67163] mb-6 opacity-60" />
        <p className="font-serif text-3xl font-light text-[#2D1A14] mb-3">Tu carrito está vacío</p>
        <p className="text-sm text-[#2D1A14]/50 mb-10 max-w-xs leading-relaxed">
          Descubre nuestra colección de aromas artesanales y encuentra el que transforma tu espacio.
        </p>
        <Link href="/catalogo" className="inline-flex items-center gap-2 border border-[#2D1A14] text-[#2D1A14] text-sm font-medium px-8 py-3 rounded-full hover:bg-[#2D1A14] hover:text-[#FAF8F5] transition-colors duration-300">
          Explorar colección
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-[#FAF8F5] min-h-screen lg:flex lg:h-screen lg:overflow-hidden">

      {/* ══════════════════════════════════════
          COLUMNA IZQUIERDA — productos
      ══════════════════════════════════════ */}
      <div className="flex-1 lg:min-h-0 lg:overflow-y-auto overscroll-contain" data-lenis-prevent>
        <div className="max-w-2xl mx-auto px-5 sm:px-8 lg:px-14 pt-8 lg:pt-10 pb-8 lg:pb-24 animate-in fade-in slide-in-from-bottom-2 duration-500">

          {/* Top nav */}
          <div className="flex items-center justify-between mb-5 lg:mb-6">
            <Link href="/" className="font-serif text-xl lg:text-2xl font-bold tracking-widest text-[#2D1A14] uppercase">
              Cliché
            </Link>
            <button onClick={() => router.push(backUrl)} className="flex items-center gap-2 text-xs text-[#2D1A14]/35 hover:text-[#2D1A14] transition-colors uppercase tracking-widest">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Seguir comprando</span>
              <span className="sm:hidden">Volver</span>
            </button>
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[10px] tracking-widest uppercase text-[#2D1A14]/25 mb-5 lg:mb-7">
            <span>Carrito</span>
            <span className="text-[#A67163]">—</span>
            <span className="text-[#2D1A14]/70 font-semibold">Resumen</span>
            <span className="text-[#A67163]">—</span>
            <span>Pago</span>
          </div>

          {/* Título */}
          <div className="mb-5 lg:mb-7">
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-light text-[#2D1A14] leading-tight">Tu pedido</h1>
            <p className="text-xs lg:text-sm text-[#2D1A14]/35 mt-1.5 tracking-wide">
              Selecciona los artículos que incluirás en este pago
            </p>
          </div>

          {/* Lista de productos */}
          <div className="border-t border-[#2D1A14]/8">
            {items.map((item) => {
              const checked = !!selected[item.product.id]
              return (
                <div key={item.product.id} className={`flex gap-3 sm:gap-5 py-5 border-b border-[#2D1A14]/8 transition-all duration-200 ${checked ? "opacity-100" : "opacity-30"}`}>
                  {/* Checkbox */}
                  <button
                    onClick={() => setSelected(p => ({ ...p, [item.product.id]: !p[item.product.id] }))}
                    className="mt-1 flex-shrink-0 w-5 h-5 border border-[#2D1A14]/25 flex items-center justify-center transition-all hover:border-[#A67163]"
                    style={{ background: checked ? "#2D1A14" : "transparent" }}
                  >
                    {checked && <svg className="w-2.5 h-2.5" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#FAF8F5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </button>

                  {/* Imagen — más pequeña en mobile */}
                  <div className="relative w-20 h-20 sm:w-28 sm:h-28 bg-[#2D1A14]/5 flex-shrink-0 overflow-hidden">
                    <Image src={item.product.image_url} alt={item.product.name} fill className="object-cover" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-sm sm:text-base text-[#2D1A14] leading-snug">{item.product.name}</p>
                    <p className="text-[10px] text-[#2D1A14]/30 mt-0.5 tracking-widest uppercase">Cliché Colombia</p>
                    <p className="text-[#A67163] text-sm font-medium mt-1.5">{fmt(priceOf(item))}<span className="text-[#2D1A14]/30 text-xs ml-1">/ ud.</span></p>
                    <div className="flex items-center mt-2 border border-[#2D1A14]/12 w-fit">
                      <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} disabled={item.quantity <= 1} className="w-8 h-8 flex items-center justify-center hover:bg-[#2D1A14]/5 transition-colors text-[#2D1A14]/40 disabled:opacity-20 disabled:cursor-not-allowed">
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <span className="w-9 text-center text-sm font-medium text-[#2D1A14]">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} disabled={item.quantity >= item.product.stock} className="w-8 h-8 flex items-center justify-center hover:bg-[#2D1A14]/5 transition-colors text-[#2D1A14]/40 disabled:opacity-20">
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>

                  {/* Precio + borrar */}
                  <div className="flex flex-col items-end justify-between min-w-[72px] sm:min-w-[90px]">
                    <button onClick={() => removeItem(item.product.id)} aria-label="Quitar del carrito" className="-m-2 p-2 text-[#2D1A14]/15 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <p className="font-serif text-base sm:text-lg text-[#2D1A14]">{fmt(priceOf(item) * item.quantity)}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Datos de contacto y envío ────────────────────── */}
          <div className="mt-8 space-y-4">
            <p className="text-[10px] text-[#2D1A14]/30 tracking-[0.2em] uppercase flex items-center gap-2">
              <MapPin className="w-3 h-3" /> Datos de envío
            </p>

            {/* Nombre + Teléfono */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex border border-[#2D1A14]/15 hover:border-[#2D1A14]/30 focus-within:border-[#A67163]/70 transition-colors duration-200">
                <div className="pl-3 flex items-center">
                  <User className="w-3.5 h-3.5 text-[#2D1A14]/20" />
                </div>
                <input
                  type="text"
                  placeholder="Nombre completo *"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="flex-1 px-3 py-3 text-sm bg-transparent text-[#2D1A14] placeholder:text-[#2D1A14]/25 outline-none font-light"
                />
              </div>
              <div className="flex border border-[#2D1A14]/15 hover:border-[#2D1A14]/30 focus-within:border-[#A67163]/70 transition-colors duration-200">
                <div className="pl-3 flex items-center">
                  <Phone className="w-3.5 h-3.5 text-[#2D1A14]/20" />
                </div>
                <input
                  type="tel"
                  placeholder="Celular *"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="flex-1 px-3 py-3 text-sm bg-transparent text-[#2D1A14] placeholder:text-[#2D1A14]/25 outline-none font-light"
                />
              </div>
            </div>

            {/* Email */}
            <div className="flex border border-[#2D1A14]/15 hover:border-[#2D1A14]/30 focus-within:border-[#A67163]/70 transition-colors duration-200">
              <div className="pl-3 flex items-center">
                <Mail className="w-3.5 h-3.5 text-[#2D1A14]/20" />
              </div>
              <input
                type="email"
                placeholder="Correo electrónico *"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                readOnly={!!user}
                title={user ? "Correo de tu cuenta" : undefined}
                className={`flex-1 px-3 py-3 text-sm bg-transparent text-[#2D1A14] placeholder:text-[#2D1A14]/25 outline-none font-light tracking-wide ${user ? "cursor-not-allowed text-[#2D1A14]/70" : ""}`}
              />
            </div>

            {/* Cédula / NIT — OBLIGATORIA: el banco la cruza al aprobar el pago
                (antifraude de Mercado Pago) y se usa para la factura. */}
            <div className="flex border border-[#2D1A14]/15 hover:border-[#2D1A14]/30 focus-within:border-[#A67163]/70 transition-colors duration-200">
              <input
                type="text"
                inputMode="numeric"
                placeholder="Cédula o NIT (el banco la pide para aprobar tu pago) *"
                value={customerIdNumber}
                onChange={(e) => setCustomerIdNumber(e.target.value.replace(/[^0-9.-]/g, ""))}
                className="flex-1 px-4 py-3 text-sm bg-transparent text-[#2D1A14] placeholder:text-[#2D1A14]/25 outline-none font-light"
              />
            </div>

            {/* Dirección */}
            <div className="flex border border-[#2D1A14]/15 hover:border-[#2D1A14]/30 focus-within:border-[#A67163]/70 transition-colors duration-200">
              <input
                type="text"
                placeholder="Dirección: calle, número, barrio *"
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                className="flex-1 px-4 py-3 text-sm bg-transparent text-[#2D1A14] placeholder:text-[#2D1A14]/25 outline-none font-light"
              />
            </div>

            {/* Ciudad + Departamento */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex border border-[#2D1A14]/15 hover:border-[#2D1A14]/30 focus-within:border-[#A67163]/70 transition-colors duration-200">
                <input
                  type="text"
                  placeholder="Ciudad / Municipio *"
                  value={addressCity}
                  onChange={(e) => setAddressCity(e.target.value)}
                  className="flex-1 px-4 py-3 text-sm bg-transparent text-[#2D1A14] placeholder:text-[#2D1A14]/25 outline-none font-light"
                />
              </div>
              <div className="flex border border-[#2D1A14]/15 hover:border-[#2D1A14]/30 focus-within:border-[#A67163]/70 transition-colors duration-200">
                <input
                  type="text"
                  placeholder="Departamento *"
                  value={addressDept}
                  onChange={(e) => setAddressDept(e.target.value)}
                  className="flex-1 px-4 py-3 text-sm bg-transparent text-[#2D1A14] placeholder:text-[#2D1A14]/25 outline-none font-light"
                />
              </div>
            </div>

            {/* Notas opcionales */}
            <div className="flex border border-[#2D1A14]/10 hover:border-[#2D1A14]/20 transition-colors duration-200">
              <input
                type="text"
                placeholder="Instrucciones de entrega (opcional)"
                value={addressNotes}
                onChange={(e) => setAddressNotes(e.target.value)}
                className="flex-1 px-4 py-3 text-sm bg-transparent text-[#2D1A14] placeholder:text-[#2D1A14]/20 outline-none font-light"
              />
            </div>
          </div>

          {/* Código de descuento — solo con sesión iniciada */}
          <div className="mt-5">
            <p className="text-[10px] text-[#2D1A14]/30 tracking-[0.2em] uppercase mb-3 flex items-center gap-2">
              <Tag className="w-3 h-3" /> Código de descuento
            </p>
            {user ? (
              <>
                <div className={`flex border transition-colors duration-200 ${couponError ? "border-red-400" : couponSuccess ? "border-green-500" : "border-[#2D1A14]/15 hover:border-[#2D1A14]/30"}`}>
                  <input
                    type="text"
                    placeholder="Ingresa tu código"
                    value={couponCode}
                    onChange={(e) => { setCouponCode(e.target.value); setCouponError(null); setCouponSuccess(null) }}
                    className="flex-1 px-4 py-3 text-sm bg-transparent text-[#2D1A14] placeholder:text-[#2D1A14]/25 outline-none font-light tracking-wide uppercase"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="px-5 py-3 text-[10px] font-semibold text-[#2D1A14]/40 hover:text-[#A67163] transition-colors uppercase tracking-widest border-l border-[#2D1A14]/15 disabled:opacity-40"
                  >
                    {couponLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Aplicar"}
                  </button>
                </div>
                {couponError && <p className="text-xs text-red-500 mt-1.5">{couponError}</p>}
                {couponSuccess && <p className="text-xs text-green-600 mt-1.5">{couponSuccess}</p>}
              </>
            ) : (
              <p className="text-xs text-[#2D1A14]/55 border border-[#2D1A14]/12 px-4 py-3 leading-relaxed">
                <Link href="/cuenta" className="text-[#A67163] underline font-medium">Inicia sesión</Link> para aplicar tu código de descuento. Cada código es de un solo uso por cuenta.
              </p>
            )}
          </div>

          {/* Autorización de datos personales (Ley 1581 de 2012) + aceptación de
              términos — obligatoria ANTES de pagar; el botón queda deshabilitado
              hasta que el cliente la marque. */}
          <label className="mt-6 flex items-start gap-3 cursor-pointer select-none border border-[#2D1A14]/12 px-4 py-3 hover:border-[#2D1A14]/25 transition-colors duration-200">
            <input
              type="checkbox"
              required
              checked={acceptedPolicies}
              onChange={(e) => { setAcceptedPolicies(e.target.checked); if (e.target.checked) setError(null) }}
              className="mt-0.5 w-4 h-4 flex-shrink-0 accent-[#A67163]"
            />
            <span className="text-xs text-[#2D1A14]/60 leading-relaxed">
              Autorizo el tratamiento de mis datos personales según la{" "}
              <Link href="/privacidad" target="_blank" className="text-[#A67163] underline font-medium">Política de privacidad</Link>{" "}
              y acepto los{" "}
              <Link href="/terminos" target="_blank" className="text-[#A67163] underline font-medium">Términos y Condiciones</Link>. *
            </span>
          </label>

          {/* Trust pillars */}
          <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-[#2D1A14]/8">
            {[
              { icon: Truck,     title: "Envío rápido",  desc: "2–5 días a toda Colombia" },
              { icon: RotateCcw, title: "Garantía total", desc: "Reembolso si no quedas satisfecho" },
              { icon: Leaf,      title: "100% natural",   desc: "Sin tóxicos, artesanal" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex flex-col items-center text-center gap-2">
                <div className="w-8 h-8 rounded-full border border-[#2D1A14]/10 flex items-center justify-center">
                  <Icon className="w-3.5 h-3.5 text-[#A67163]/70" />
                </div>
                <p className="text-[10px] font-semibold text-[#2D1A14]/60 tracking-wide leading-tight">{title}</p>
                <p className="text-[9px] text-[#2D1A14]/30 leading-relaxed hidden sm:block">{desc}</p>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-[#2D1A14]/15 tracking-widest uppercase mt-8 text-center">
            Aromas artesanales · Fabricado en Colombia · 100% naturales
          </p>

          {/* Espaciado extra en mobile para el sticky bar */}
          <div className="h-28 lg:hidden" />
        </div>
      </div>

      {/* ══════════════════════════════════════
          DERECHA — resumen (desktop only)
      ══════════════════════════════════════ */}
      <div className="hidden lg:flex w-[400px] xl:w-[440px] flex-shrink-0 bg-[#2D1A14] h-screen min-h-0 overflow-y-auto overscroll-contain flex-col animate-in fade-in slide-in-from-right duration-500" data-lenis-prevent>
        <div className="flex flex-col min-h-full px-10 xl:px-12 pt-14 pb-10">

          <p className="text-[#FAF8F5]/25 text-[9px] tracking-[0.25em] uppercase mb-8">Resumen del pedido</p>

          <div className="space-y-5 flex-1">
            {selectedItems.length === 0 ? (
              <p className="text-[#FAF8F5]/20 text-sm py-4">Ningún artículo seleccionado</p>
            ) : (
              selectedItems.map((i) => (
                <div key={i.product.id} className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-[#FAF8F5]/75 text-sm leading-snug">{i.product.name}</p>
                    {i.quantity > 1 && <p className="text-[#FAF8F5]/25 text-xs mt-0.5 tracking-wide">× {i.quantity}</p>}
                  </div>
                  <p className="text-[#FAF8F5]/60 text-sm tabular-nums flex-shrink-0">{fmt(priceOf(i) * i.quantity)}</p>
                </div>
              ))
            )}
          </div>

          {subtotal > 0 && (
            <div className="mt-8 space-y-2">
              <div className="h-[1px] bg-[#FAF8F5]/8 w-full overflow-hidden">
                <div className="h-full bg-[#A67163]/60 transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[10px] text-[#FAF8F5]/25 tracking-wide text-center">
                {freeShipping ? <span className="text-[#A67163]/80">Envío gratuito aplicado</span> : <>{fmt(FREE_SHIPPING - subtotal)} más para envío gratis</>}
              </p>
            </div>
          )}

          <div className="mt-8 pt-8 border-t border-[#FAF8F5]/6 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[#FAF8F5]/30 text-xs tracking-widest uppercase">Subtotal</span>
              <span className="text-[#FAF8F5]/50 text-sm tabular-nums">{subtotal > 0 ? fmt(subtotal) : "—"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#FAF8F5]/30 text-xs tracking-widest uppercase">Envío</span>
              <span className={`text-sm tabular-nums ${freeShipping && subtotal > 0 ? "text-[#A67163]/80" : "text-[#FAF8F5]/50"}`}>
                {subtotal === 0 ? "—" : freeShipping ? "Gratis" : fmt(shipping)}
              </span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-green-400/70 text-xs tracking-widest uppercase flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Descuento
                </span>
                <span className="text-green-400 text-sm tabular-nums">−{fmt(discountAmount)}</span>
              </div>
            )}
          </div>

          <div className="mt-8 pt-8 border-t border-[#FAF8F5]/6">
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <span className="text-[#FAF8F5]/30 text-[10px] tracking-[0.2em] uppercase">Total a pagar</span>
              <span className="text-[#FAF8F5]/20 text-[10px] tracking-wide">COP · IVA incl.</span>
            </div>
            <p className="font-serif text-right mt-2">
              <span className="text-[#FAF8F5]/40 text-lg align-top mt-2 inline-block mr-1">$</span>
              <span className="text-[#FAF8F5] text-5xl font-light tracking-tight">{subtotal > 0 ? splitNum(total) : "—"}</span>
            </p>
          </div>

          {error && (
            <div className="mt-5 bg-red-950/50 border border-red-500/20 rounded-xl p-3">
              <p className="text-red-300 text-xs">{error}</p>
            </div>
          )}

          <div className="mt-8 space-y-3">
            <button
              onClick={handlePay}
              disabled={isLoading || selectedItems.length === 0}
              className="w-full rounded-full py-4 px-6 flex items-center justify-center gap-3 bg-[#A67163] text-white font-semibold text-sm tracking-wide hover:bg-[#8B5E52] active:scale-[0.99] transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed"
            >
              {isLoading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Procesando...</>
                : <><Lock className="w-3.5 h-3.5 opacity-70" /> {selectedItems.length > 0 ? `Pagar ${fmt(total)}` : "Selecciona artículos"}</>
              }
            </button>
            <div className="flex items-center justify-center gap-2 text-[#FAF8F5]/20 text-[10px] tracking-wide">
              <ShieldCheck className="w-3 h-3 text-[#A67163]/50" />
              <span>Pago cifrado · Protección al comprador</span>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-[#FAF8F5]/6 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <Truck className="w-3.5 h-3.5 text-[#A67163]/60 mt-0.5 flex-shrink-0" />
                <p className="text-[#FAF8F5]/30 text-[10px] leading-relaxed">Envío en 2–5 días hábiles a todo Colombia</p>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#A67163]/60 mt-0.5 flex-shrink-0" />
                <p className="text-[#FAF8F5]/30 text-[10px] leading-relaxed">Garantía de satisfacción o reembolso total</p>
              </div>
            </div>
            <div>
              <p className="text-[#FAF8F5]/15 text-[8px] tracking-[0.2em] uppercase mb-2.5 text-center">Métodos de pago</p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {["Visa", "Mastercard", "PSE", "Nequi", "Bancolombia"].map((m) => (
                  <span key={m} className="text-[8px] font-medium text-[#FAF8F5]/20 border border-[#FAF8F5]/8 rounded px-2 py-0.5 tracking-wider">{m}</span>
                ))}
              </div>
              {/* La pasarela real es Mercado Pago (/api/checkout crea la preferencia):
                  anunciar otra marca justo antes de redirigir huele a phishing. */}
              <p className="text-center text-[#FAF8F5]/10 text-[8px] tracking-widest uppercase mt-3">Pago seguro procesado por Mercado Pago</p>
            </div>
          </div>

        </div>
      </div>

      {/* ══════════════════════════════════════
          MOBILE — barra sticky inferior
      ══════════════════════════════════════ */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#2D1A14] shadow-2xl">

        {/* Resumen expandible */}
        {mobileResumenOpen && (
          <div className="px-5 pt-5 pb-3 border-b border-[#FAF8F5]/8">
            {/* Items */}
            <div className="space-y-3 mb-4">
              {selectedItems.length === 0 ? (
                <p className="text-[#FAF8F5]/30 text-xs">Ningún artículo seleccionado</p>
              ) : selectedItems.map((i) => (
                <div key={i.product.id} className="flex justify-between items-start gap-3">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="relative w-9 h-9 flex-shrink-0 overflow-hidden bg-[#FAF8F5]/5">
                      <Image src={i.product.image_url} alt={i.product.name} fill className="object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[#FAF8F5]/80 text-xs leading-snug truncate">{i.product.name}</p>
                      {i.quantity > 1 && <p className="text-[#FAF8F5]/30 text-[10px]">× {i.quantity}</p>}
                    </div>
                  </div>
                  <p className="text-[#FAF8F5]/60 text-xs tabular-nums flex-shrink-0">{fmt(priceOf(i) * i.quantity)}</p>
                </div>
              ))}
            </div>

            {/* Barra envío */}
            {subtotal > 0 && (
              <div className="mb-4 space-y-1.5">
                <div className="h-[1px] bg-[#FAF8F5]/8 w-full overflow-hidden">
                  <div className="h-full bg-[#A67163]/60 transition-all duration-700" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[9px] text-[#FAF8F5]/25 text-center">
                  {freeShipping ? <span className="text-[#A67163]/70">Envío gratuito aplicado</span> : <>{fmt(FREE_SHIPPING - subtotal)} más para envío gratis</>}
                </p>
              </div>
            )}

            {/* Desglose */}
            <div className="space-y-2 pt-3 border-t border-[#FAF8F5]/6">
              <div className="flex justify-between">
                <span className="text-[#FAF8F5]/30 text-xs uppercase tracking-widest">Subtotal</span>
                <span className="text-[#FAF8F5]/50 text-xs tabular-nums">{subtotal > 0 ? fmt(subtotal) : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#FAF8F5]/30 text-xs uppercase tracking-widest">Envío</span>
                <span className={`text-xs tabular-nums ${freeShipping && subtotal > 0 ? "text-[#A67163]/80" : "text-[#FAF8F5]/50"}`}>
                  {subtotal === 0 ? "—" : freeShipping ? "Gratis" : fmt(shipping)}
                </span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-green-400/70 text-xs uppercase tracking-widest flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Descuento
                  </span>
                  <span className="text-green-400 text-xs tabular-nums">−{fmt(discountAmount)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-5 pt-3">
            <p className="text-red-300 text-xs bg-red-950/50 border border-red-500/20 rounded-lg p-2.5">{error}</p>
          </div>
        )}

        {/* Fila principal: total + botón pagar */}
        <div className="flex items-center gap-3 px-5 py-4">
          {/* Total + toggle */}
          <button
            onClick={() => setMobileResumenOpen(v => !v)}
            className="flex-1 flex items-center gap-2 min-w-0"
          >
            <div className="min-w-0">
              <p className="text-[#FAF8F5]/30 text-[9px] uppercase tracking-widest flex items-center gap-1">
                Total {mobileResumenOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
              </p>
              <p className="font-serif text-[#FAF8F5] text-xl font-light tabular-nums">
                {subtotal > 0 ? fmt(total) : "—"}
              </p>
            </div>
          </button>

          {/* Botón pagar */}
          <button
            onClick={handlePay}
            disabled={isLoading || selectedItems.length === 0}
            className="flex-shrink-0 rounded-full py-3.5 px-6 flex items-center justify-center gap-2 bg-[#A67163] text-white font-semibold text-sm tracking-wide hover:bg-[#8B5E52] active:scale-[0.98] transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed"
          >
            {isLoading
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Procesando</>
              : <><Lock className="w-3.5 h-3.5 opacity-70" /> Pagar</>
            }
          </button>
        </div>

        {/* Métodos de pago mobile */}
        <div className="flex items-center justify-center gap-1.5 pb-4 flex-wrap px-5">
          {["Visa", "Mastercard", "PSE", "Nequi"].map((m) => (
            <span key={m} className="text-[8px] font-medium text-[#FAF8F5]/15 border border-[#FAF8F5]/8 rounded px-1.5 py-0.5">{m}</span>
          ))}
        </div>
      </div>

    </div>
  )
}
