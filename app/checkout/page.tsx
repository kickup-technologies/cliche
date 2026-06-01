"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCart } from "@/context/cart-context"
import { useCAPI } from "@/lib/use-capi"
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
  const [discountAmount, setDiscountAmount] = useState(0)
  const [appliedCode, setAppliedCode] = useState<string | null>(null)
  // Shipping address
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [addressLine, setAddressLine] = useState("")
  const [addressCity, setAddressCity] = useState("")
  const [addressDept, setAddressDept] = useState("")
  const [addressNotes, setAddressNotes] = useState("")
  const router = useRouter()
  const { track } = useCAPI()

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
  const subtotal = selectedItems.reduce((s, i) => s + i.product.price * i.quantity, 0)
  const FREE_SHIPPING = 300000
  const freeShipping = subtotal >= FREE_SHIPPING
  const shipping = freeShipping ? 0 : subtotal > 0 ? 15000 : 0
  const total = subtotal + shipping - discountAmount
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
        setDiscountAmount(data.discount_amount)
        setAppliedCode(couponCode.toUpperCase().trim())
        setCouponSuccess(`Descuento aplicado: ${data.type === "percentage" ? `${data.value}%` : fmt(data.value)} de descuento`)
      } else {
        setCouponError(data.error || "Código inválido")
        setDiscountAmount(0)
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
          items: selectedItems.map((i) => ({ product_id: i.product.id, quantity: i.quantity, unit_price: i.product.price, name: i.product.name })),
          total,
          email: customerEmail,
          discount_code: appliedCode,
          discount_amount: discountAmount,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          shipping_address: {
            address: addressLine.trim(),
            city: addressCity.trim(),
            department: addressDept.trim(),
            notes: addressNotes.trim() || null,
          },
        }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setError(data.error || "Error al procesar. Intenta de nuevo.")
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
        <Link href="/catalogo" className="inline-flex items-center gap-2 border border-[#2D1A14] text-[#2D1A14] text-sm font-medium px-8 py-3 hover:bg-[#2D1A14] hover:text-[#FAF8F5] transition-colors duration-300">
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
      <div className="flex-1 lg:overflow-y-auto">
        <div className="max-w-2xl mx-auto px-5 sm:px-8 lg:px-14 pt-8 lg:pt-10 pb-8 lg:pb-24">

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
                    <p className="text-[10px] text-[#2D1A14]/30 mt-0.5 tracking-widest uppercase">Bienestar by Cliché</p>
                    <p className="text-[#A67163] text-sm font-medium mt-1.5">{fmt(item.product.price)}<span className="text-[#2D1A14]/30 text-xs ml-1">/ ud.</span></p>
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
                    <button onClick={() => removeItem(item.product.id)} className="text-[#2D1A14]/15 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <p className="font-serif text-base sm:text-lg text-[#2D1A14]">{fmt(item.product.price * item.quantity)}</p>
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
              <div className="flex border border-[#2D1A14]/15 hover:border-[#2D1A14]/30 transition-colors duration-200">
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
              <div className="flex border border-[#2D1A14]/15 hover:border-[#2D1A14]/30 transition-colors duration-200">
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
            <div className="flex border border-[#2D1A14]/15 hover:border-[#2D1A14]/30 transition-colors duration-200">
              <div className="pl-3 flex items-center">
                <Mail className="w-3.5 h-3.5 text-[#2D1A14]/20" />
              </div>
              <input
                type="email"
                placeholder="Correo electrónico *"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="flex-1 px-3 py-3 text-sm bg-transparent text-[#2D1A14] placeholder:text-[#2D1A14]/25 outline-none font-light tracking-wide"
              />
            </div>

            {/* Dirección */}
            <div className="flex border border-[#2D1A14]/15 hover:border-[#2D1A14]/30 transition-colors duration-200">
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
              <div className="flex border border-[#2D1A14]/15 hover:border-[#2D1A14]/30 transition-colors duration-200">
                <input
                  type="text"
                  placeholder="Ciudad / Municipio *"
                  value={addressCity}
                  onChange={(e) => setAddressCity(e.target.value)}
                  className="flex-1 px-4 py-3 text-sm bg-transparent text-[#2D1A14] placeholder:text-[#2D1A14]/25 outline-none font-light"
                />
              </div>
              <div className="flex border border-[#2D1A14]/15 hover:border-[#2D1A14]/30 transition-colors duration-200">
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

          {/* Código de descuento */}
          <div className="mt-5">
            <p className="text-[10px] text-[#2D1A14]/30 tracking-[0.2em] uppercase mb-3 flex items-center gap-2">
              <Tag className="w-3 h-3" /> Código de descuento
            </p>
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
          </div>

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
      <div className="hidden lg:flex w-[400px] xl:w-[440px] flex-shrink-0 bg-[#2D1A14] h-screen overflow-y-auto flex-col">
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
                  <p className="text-[#FAF8F5]/60 text-sm tabular-nums flex-shrink-0">{fmt(i.product.price * i.quantity)}</p>
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
              className="w-full rounded-xl py-4 px-6 flex items-center justify-center gap-3 bg-[#A67163] text-white font-semibold text-sm tracking-wide hover:bg-[#8B5E52] active:scale-[0.99] transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed"
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
              <p className="text-center text-[#FAF8F5]/10 text-[8px] tracking-widest uppercase mt-3">Powered by Wompi · Bancolombia</p>
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
                  <p className="text-[#FAF8F5]/60 text-xs tabular-nums flex-shrink-0">{fmt(i.product.price * i.quantity)}</p>
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
            className="flex-shrink-0 rounded-xl py-3.5 px-6 flex items-center justify-center gap-2 bg-[#A67163] text-white font-semibold text-sm tracking-wide hover:bg-[#8B5E52] active:scale-[0.98] transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed"
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
