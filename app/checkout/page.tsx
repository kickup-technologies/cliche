"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useCart } from "@/context/cart-context"
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, Lock, Sparkles, ShieldCheck } from "lucide-react"

function fmt(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n)
}

export default function CheckoutPage() {
  const { items, removeItem, updateQuantity } = useCart()
  const [selected, setSelected] = useState<Record<string, boolean>>({})

  // Seleccionar todos por defecto cuando los items cargan desde localStorage
  useEffect(() => {
    setSelected(prev => {
      const next = { ...prev }
      items.forEach(i => {
        if (!(i.product.id in next)) next[i.product.id] = true
      })
      return next
    })
  }, [items])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedItems = items.filter((i) => selected[i.product.id])
  const subtotal = selectedItems.reduce((s, i) => s + i.product.price * i.quantity, 0)
  const FREE_SHIPPING = 300000
  const freeShipping = subtotal >= FREE_SHIPPING
  const shipping = freeShipping ? 0 : subtotal > 0 ? 15000 : 0
  const total = subtotal + shipping
  const pct = Math.min(100, Math.round((subtotal / FREE_SHIPPING) * 100))

  async function handlePay() {
    if (!selectedItems.length) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: selectedItems.map((i) => ({ product_id: i.product.id, quantity: i.quantity, unit_price: i.product.price, name: i.product.name })),
          total,
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

  /* ── Carrito vacío ── */
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
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ════════════════════════════════
          PANEL IZQUIERDO — Crema
      ════════════════════════════════ */}
      <div className="flex-1 bg-[#FAF8F5] flex flex-col min-h-screen">

        {/* Topbar */}
        <div className="flex items-center justify-between px-8 lg:px-14 pt-10 pb-6">
          <Link href="/" className="font-serif text-2xl font-bold tracking-widest text-[#2D1A14] uppercase">
            Cliché
          </Link>
          <Link href="/" className="flex items-center gap-2 text-xs text-[#2D1A14]/40 hover:text-[#2D1A14] transition-colors uppercase tracking-widest">
            <ArrowLeft className="w-3.5 h-3.5" />
            Seguir comprando
          </Link>
        </div>

        {/* Breadcrumb */}
        <div className="px-8 lg:px-14 pb-8">
          <div className="flex items-center gap-3 text-xs tracking-widest uppercase text-[#2D1A14]/30">
            <span>Carrito</span>
            <span className="text-[#A67163]">—</span>
            <span className="text-[#2D1A14]/80 font-medium">Resumen</span>
            <span className="text-[#A67163]">—</span>
            <span>Pago</span>
          </div>
        </div>

        {/* Título */}
        <div className="px-8 lg:px-14 pb-10">
          <h1 className="font-serif text-4xl lg:text-5xl font-light text-[#2D1A14] leading-tight">
            Tu pedido
          </h1>
          <p className="text-sm text-[#2D1A14]/40 mt-2 tracking-wide">
            Selecciona los artículos que incluirás en este pago
          </p>
        </div>

        {/* Lista de productos */}
        <div className="px-8 lg:px-14 flex-1">
          <div className="border-t border-[#2D1A14]/10">
            {items.map((item, idx) => {
              const checked = !!selected[item.product.id]
              return (
                <div
                  key={item.product.id}
                  className={`flex gap-6 py-7 border-b border-[#2D1A14]/10 transition-opacity duration-200 ${checked ? "opacity-100" : "opacity-35"}`}
                >
                  {/* Custom checkbox */}
                  <button
                    onClick={() => setSelected(p => ({ ...p, [item.product.id]: !p[item.product.id] }))}
                    className="mt-1 flex-shrink-0 w-5 h-5 rounded-none border border-[#2D1A14]/30 flex items-center justify-center transition-colors hover:border-[#A67163]"
                    style={{ background: checked ? "#2D1A14" : "transparent" }}
                    aria-label="Seleccionar"
                  >
                    {checked && <svg className="w-2.5 h-2.5" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#FAF8F5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </button>

                  {/* Imagen */}
                  <div className="relative w-[88px] h-[88px] bg-[#2D1A14]/5 flex-shrink-0 overflow-hidden">
                    <Image src={item.product.image_url} alt={item.product.name} fill className="object-cover" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-base text-[#2D1A14] leading-snug">{item.product.name}</p>
                    <p className="text-xs text-[#2D1A14]/40 mt-0.5 tracking-wide uppercase">Bienestar by Cliché</p>
                    <p className="text-[#A67163] font-semibold text-sm mt-2">{fmt(item.product.price)} / unidad</p>

                    {/* Cantidad */}
                    <div className="flex items-center gap-0 mt-3 border border-[#2D1A14]/15 w-fit">
                      <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center hover:bg-[#2D1A14]/5 transition-colors text-[#2D1A14]/50">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-9 text-center text-sm font-medium text-[#2D1A14]">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} disabled={item.quantity >= item.product.stock} className="w-8 h-8 flex items-center justify-center hover:bg-[#2D1A14]/5 transition-colors text-[#2D1A14]/50 disabled:opacity-20">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Precio total + eliminar */}
                  <div className="flex flex-col items-end justify-between">
                    <button onClick={() => removeItem(item.product.id)} className="text-[#2D1A14]/20 hover:text-red-400 transition-colors p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <p className="font-serif text-lg font-medium text-[#2D1A14]">
                      {fmt(item.product.price * item.quantity)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer izquierdo */}
        <div className="px-8 lg:px-14 py-8 mt-auto">
          <p className="text-xs text-[#2D1A14]/30 tracking-widest uppercase">
            Aromas artesanales · Fabricado en Colombia · 100% naturales
          </p>
        </div>
      </div>

      {/* ════════════════════════════════
          PANEL DERECHO — Mocha oscuro
      ════════════════════════════════ */}
      <div className="w-full lg:w-[420px] xl:w-[460px] bg-[#2D1A14] flex flex-col lg:min-h-screen lg:sticky lg:top-0 lg:h-screen">
        <div className="flex flex-col h-full px-8 xl:px-12 py-10 lg:py-14">

          {/* Header panel */}
          <div className="mb-10">
            <p className="text-[#FAF8F5]/30 text-xs tracking-widest uppercase mb-2">Resumen</p>
            <h2 className="font-serif text-3xl font-light text-[#FAF8F5]">
              {selectedItems.length > 0 ? fmt(total) : "—"}
            </h2>
            <p className="text-[#FAF8F5]/40 text-xs mt-1">
              {selectedItems.length} {selectedItems.length === 1 ? "producto" : "productos"} · COP
            </p>
          </div>

          {/* Separador decorativo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 bg-[#FAF8F5]/10" />
            <div className="w-1 h-1 rounded-full bg-[#A67163]" />
            <div className="h-px flex-1 bg-[#FAF8F5]/10" />
          </div>

          {/* Items seleccionados */}
          <div className="flex-1 space-y-4 mb-8">
            {selectedItems.length === 0 ? (
              <p className="text-[#FAF8F5]/30 text-sm text-center py-6">Ningún producto seleccionado</p>
            ) : (
              selectedItems.map((i) => (
                <div key={i.product.id} className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[#FAF8F5]/80 text-sm leading-snug line-clamp-1">{i.product.name}</p>
                    {i.quantity > 1 && <p className="text-[#FAF8F5]/30 text-xs mt-0.5">× {i.quantity} unidades</p>}
                  </div>
                  <p className="text-[#FAF8F5] text-sm font-medium flex-shrink-0">{fmt(i.product.price * i.quantity)}</p>
                </div>
              ))
            )}
          </div>

          {/* Barra envío gratis */}
          {subtotal > 0 && (
            <div className="mb-6 space-y-2">
              <div className="h-px bg-[#FAF8F5]/8 overflow-hidden rounded-full">
                <div className="h-full bg-gradient-to-r from-[#A67163] to-[#C4958A] transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-[#FAF8F5]/30 text-center">
                {freeShipping
                  ? <span className="text-[#C4958A] flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> Envío incluido gratuitamente</span>
                  : <>Agrega {fmt(FREE_SHIPPING - subtotal)} más para envío gratis</>}
              </p>
            </div>
          )}

          {/* Desglose */}
          <div className="border-t border-[#FAF8F5]/8 pt-5 space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-[#FAF8F5]/40">Subtotal</span>
              <span className="text-[#FAF8F5]/70">{subtotal > 0 ? fmt(subtotal) : "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#FAF8F5]/40">Envío</span>
              <span className={freeShipping && subtotal > 0 ? "text-[#C4958A]" : "text-[#FAF8F5]/70"}>
                {subtotal === 0 ? "—" : freeShipping ? "Gratis" : fmt(shipping)}
              </span>
            </div>
          </div>

          <div className="border-t border-[#FAF8F5]/8 pt-5 mb-8">
            <div className="flex justify-between items-end">
              <span className="text-[#FAF8F5]/60 text-sm uppercase tracking-widest">Total</span>
              <div className="text-right">
                <p className="font-serif text-3xl font-light text-[#FAF8F5]">{subtotal > 0 ? fmt(total) : "—"}</p>
                <p className="text-[#FAF8F5]/25 text-[10px] mt-0.5 tracking-wide">IVA incluido</p>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 bg-red-900/30 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-300 text-xs">{error}</p>
            </div>
          )}

          {/* CTA principal */}
          <div className="space-y-3">
            <button
              onClick={handlePay}
              disabled={isLoading || selectedItems.length === 0}
              className="w-full rounded-2xl bg-[#FAF8F5] text-[#2D1A14] flex flex-col items-center justify-center gap-0.5 py-5 hover:bg-[#A67163] hover:text-white active:scale-[0.99] transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed group shadow-lg shadow-black/20"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mb-1" />
                  <span className="text-sm font-semibold tracking-wide">Procesando pago...</span>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 opacity-60" />
                    <span className="text-xs font-medium tracking-widest uppercase opacity-60">Pago seguro</span>
                  </div>
                  <span className="font-serif text-2xl font-semibold mt-0.5">
                    {selectedItems.length > 0 ? fmt(total) : "Selecciona productos"}
                  </span>
                  {selectedItems.length > 0 && (
                    <span className="text-xs opacity-50 mt-0.5">
                      {selectedItems.length} {selectedItems.length === 1 ? "producto" : "productos"} · COP
                    </span>
                  )}
                </>
              )}
            </button>

            {/* Garantía didáctica */}
            <div className="flex items-center justify-center gap-2 text-[#FAF8F5]/40 text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-[#A67163]" />
              <span>Compra protegida · Reembolso garantizado</span>
            </div>
          </div>

          {/* Métodos de pago */}
          <div className="mt-5 space-y-3">
            <p className="text-center text-[9px] text-[#FAF8F5]/20 tracking-widest uppercase">Métodos aceptados</p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {["Visa", "Mastercard", "PSE", "Nequi", "Bancolombia"].map((m) => (
                <span key={m} className="text-[9px] font-semibold text-[#FAF8F5]/30 border border-[#FAF8F5]/10 rounded-md px-2 py-1 tracking-wide">
                  {m}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-center gap-1.5 text-[#FAF8F5]/15">
              <Lock className="w-2.5 h-2.5" />
              <span className="text-[9px] tracking-widest uppercase">Cifrado SSL · Powered by Wompi</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
