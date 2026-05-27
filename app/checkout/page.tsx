"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useCart } from "@/context/cart-context"
import { Button } from "@/components/ui/button"
import {
  Trash2, Plus, Minus, ShoppingBag, ArrowLeft,
  Zap, ShieldCheck, Truck, RotateCcw, Lock, ChevronRight
} from "lucide-react"

function formatPrice(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(n)
}

export default function CheckoutPage() {
  const { items, removeItem, updateQuantity } = useCart()
  const [selected, setSelected] = useState<Record<string, boolean>>(
    () => Object.fromEntries(items.map((i) => [i.product.id, true]))
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedItems = items.filter((i) => selected[i.product.id])
  const subtotal = selectedItems.reduce((s, i) => s + i.product.price * i.quantity, 0)
  const FREE_SHIPPING = 300000
  const freeShipping = subtotal >= FREE_SHIPPING
  const shippingCost = freeShipping ? 0 : subtotal > 0 ? 15000 : 0
  const total = subtotal + shippingCost
  const pctToFree = Math.min(100, Math.round((subtotal / FREE_SHIPPING) * 100))

  function toggleSelect(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  async function handlePay() {
    if (!selectedItems.length) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: selectedItems.map((i) => ({
            product_id: i.product.id,
            quantity: i.quantity,
            unit_price: i.product.price,
            name: i.product.name,
          })),
          total,
        }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || "Error al procesar el pago. Intenta de nuevo.")
      }
    } catch {
      setError("Error de conexión. Verifica tu internet e intenta de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-9 h-9 text-muted-foreground" />
          </div>
          <h1 className="font-serif text-2xl font-bold mb-2">Tu carrito está vacío</h1>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
            Explora nuestra colección y encuentra el aroma perfecto para tu espacio.
          </p>
          <Link href="/catalogo">
            <Button size="lg" className="rounded-full px-8">Ver colección</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Top bar minimalista */}
      <div className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-serif text-xl font-bold tracking-wide text-foreground">
            Cliché
          </Link>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="text-foreground font-medium">Carrito</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-primary font-medium">Resumen</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Pago</span>
          </div>
          <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Seguir comprando</span>
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 lg:py-16">
        <div className="grid lg:grid-cols-[1fr_420px] gap-10 lg:gap-16 items-start">

          {/* ── Columna izquierda: productos ── */}
          <div>
            <div className="flex items-baseline justify-between mb-6">
              <h1 className="font-serif text-2xl lg:text-3xl font-bold">Tu pedido</h1>
              <span className="text-sm text-muted-foreground">
                {items.length} {items.length === 1 ? "producto" : "productos"}
              </span>
            </div>

            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              Selecciona qué incluir en este pago. Puedes dejar productos para después.
            </p>

            <div className="space-y-3">
              {items.map((item) => {
                const isChecked = !!selected[item.product.id]
                return (
                  <div
                    key={item.product.id}
                    className={`group relative flex gap-5 p-5 rounded-2xl border transition-all duration-200 ${
                      isChecked
                        ? "border-primary/20 bg-white shadow-sm"
                        : "border-border/50 bg-white/40 opacity-55"
                    }`}
                  >
                    {/* Checkbox elegante */}
                    <label className="flex items-center cursor-pointer mt-0.5">
                      <div
                        onClick={() => toggleSelect(item.product.id)}
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
                          isChecked
                            ? "bg-primary border-primary"
                            : "border-border bg-white"
                        }`}
                      >
                        {isChecked && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </label>

                    {/* Imagen */}
                    <div className="relative w-[72px] h-[72px] rounded-xl overflow-hidden bg-muted/40 flex-shrink-0">
                      <Image
                        src={item.product.image_url}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-snug">{item.product.name}</p>
                      <p className="text-primary font-bold text-base mt-0.5">
                        {formatPrice(item.product.price)}
                        <span className="text-xs text-muted-foreground font-normal ml-1">/ unidad</span>
                      </p>

                      {/* Cantidad */}
                      <div className="flex items-center gap-2 mt-3">
                        <div className="flex items-center border border-border rounded-xl overflow-hidden">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-9 text-center text-sm font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            disabled={item.quantity >= item.product.stock}
                            className="w-8 h-8 flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground disabled:opacity-30"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-xs text-muted-foreground">{item.product.stock} disponibles</span>
                      </div>
                    </div>

                    {/* Subtotal + eliminar */}
                    <div className="flex flex-col items-end justify-between min-w-[80px]">
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="text-muted-foreground/50 hover:text-red-400 transition-colors p-1 -mr-1 opacity-0 group-hover:opacity-100"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <p className="font-bold text-sm text-right">
                        {formatPrice(item.product.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3 mt-8">
              {[
                { icon: ShieldCheck, label: "Pago seguro", sub: "Wompi · Bancolombia" },
                { icon: Truck, label: "Envío rápido", sub: "2-5 días hábiles" },
                { icon: RotateCcw, label: "Garantía", sub: "Satisfacción total" },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex flex-col items-center text-center gap-1.5 p-4 bg-white rounded-2xl border border-border/50">
                  <Icon className="w-5 h-5 text-primary" />
                  <p className="text-xs font-semibold">{label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Columna derecha: resumen ── */}
          <div className="sticky top-20">
            <div className="bg-white rounded-3xl border border-border/60 shadow-sm overflow-hidden">
              {/* Header del panel */}
              <div className="bg-foreground px-6 py-5">
                <h2 className="font-serif text-lg font-bold text-background">Resumen del pago</h2>
                <p className="text-background/60 text-xs mt-0.5">
                  {selectedItems.length} de {items.length} productos seleccionados
                </p>
              </div>

              <div className="p-6 space-y-5">
                {/* Desglose de items */}
                {selectedItems.length > 0 ? (
                  <div className="space-y-2.5">
                    {selectedItems.map((i) => (
                      <div key={i.product.id} className="flex items-start justify-between gap-3 text-sm">
                        <span className="text-muted-foreground leading-tight line-clamp-2 flex-1">
                          {i.product.name}
                          {i.quantity > 1 && (
                            <span className="ml-1 text-xs font-medium text-foreground">×{i.quantity}</span>
                          )}
                        </span>
                        <span className="font-medium flex-shrink-0">
                          {formatPrice(i.product.price * i.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Ningún producto seleccionado
                  </p>
                )}

                {/* Barra de envío gratis */}
                {subtotal > 0 && (
                  <div className="space-y-2 py-1">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-green-500 rounded-full transition-all duration-700"
                        style={{ width: `${pctToFree}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      {freeShipping
                        ? <span className="text-green-600 font-semibold">¡Tienes envío gratis!</span>
                        : <>Te faltan <strong className="text-foreground">{formatPrice(FREE_SHIPPING - subtotal)}</strong> para envío gratis</>
                      }
                    </p>
                  </div>
                )}

                {/* Totales */}
                <div className="border-t border-border pt-4 space-y-2.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="text-foreground">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Envío</span>
                    <span className={freeShipping ? "text-green-600 font-semibold" : "text-foreground"}>
                      {subtotal === 0 ? "—" : freeShipping ? "Gratis" : formatPrice(shippingCost)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold">Total a pagar</span>
                    <div className="text-right">
                      <p className="text-2xl font-bold font-serif text-primary">{formatPrice(total)}</p>
                      <p className="text-xs text-muted-foreground">COP · IVA incluido</p>
                    </div>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* Botón pagar */}
                <Button
                  size="lg"
                  className="w-full h-14 rounded-2xl font-semibold text-base gap-2"
                  onClick={handlePay}
                  disabled={isLoading || selectedItems.length === 0}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Pagar {selectedItems.length > 0 ? formatPrice(total) : ""}
                    </>
                  )}
                </Button>

                {selectedItems.length === 0 && (
                  <p className="text-xs text-center text-muted-foreground">
                    Selecciona al menos un producto para continuar
                  </p>
                )}

                {/* Métodos de pago */}
                <div className="pt-1">
                  <p className="text-[10px] text-center text-muted-foreground mb-2.5 uppercase tracking-wider">
                    Métodos de pago aceptados
                  </p>
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    {["Visa", "Mastercard", "PSE", "Nequi"].map((m) => (
                      <span key={m} className="text-[10px] font-semibold border border-border rounded-md px-2 py-1 text-muted-foreground bg-muted/40">
                        {m}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-1.5 mt-3 text-[10px] text-muted-foreground">
                    <Lock className="w-3 h-3" />
                    <span>Cifrado SSL · Powered by Wompi</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
