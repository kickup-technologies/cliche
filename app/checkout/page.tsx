"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useCart } from "@/context/cart-context"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, Zap, ShieldCheck, Truck, RotateCcw } from "lucide-react"

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
  const freeShipping = subtotal >= 300000
  const shippingCost = freeShipping ? 0 : subtotal > 0 ? 15000 : 0
  const total = subtotal + shippingCost

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
            // Enviamos precio del cliente (ya vino de Supabase)
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
      <>
        <Header />
        <main className="min-h-screen bg-background pt-32 pb-16 px-4">
          <div className="max-w-lg mx-auto text-center">
            <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-serif font-bold mb-2">Tu carrito está vacío</h1>
            <p className="text-muted-foreground mb-6">Agrega productos antes de proceder al pago.</p>
            <Link href="/catalogo">
              <Button size="lg" className="rounded-2xl">Ver productos</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-28 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-serif font-bold">Resumen de tu pedido</h1>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Lista de productos */}
            <div className="lg:col-span-2 space-y-4">
              <p className="text-sm text-muted-foreground">
                Selecciona los productos que quieres incluir en este pago:
              </p>

              {items.map((item) => {
                const isChecked = !!selected[item.product.id]
                return (
                  <div
                    key={item.product.id}
                    className={`flex gap-4 p-4 rounded-2xl border transition-all ${
                      isChecked
                        ? "border-primary/30 bg-primary/5"
                        : "border-border bg-muted/20 opacity-60"
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="flex items-center pt-1">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelect(item.product.id)}
                        className="w-5 h-5 rounded accent-primary cursor-pointer"
                      />
                    </div>

                    {/* Imagen */}
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                      <Image
                        src={item.product.image_url}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-tight truncate">{item.product.name}</p>
                      <p className="text-primary font-bold mt-1">{formatPrice(item.product.price)}</p>

                      {/* Cantidad */}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          disabled={item.quantity >= item.product.stock}
                          className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-40"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Subtotal + eliminar */}
                    <div className="flex flex-col items-end justify-between">
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                        title="Eliminar del carrito"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <p className="text-sm font-bold">
                        {formatPrice(item.product.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Resumen del pago */}
            <div className="lg:col-span-1">
              <div className="sticky top-28 bg-card border border-border rounded-3xl p-6 space-y-4">
                <h2 className="font-serif font-bold text-lg">Tu pago</h2>

                {/* Desglose */}
                <div className="space-y-2 text-sm">
                  {selectedItems.map((i) => (
                    <div key={i.product.id} className="flex justify-between gap-2">
                      <span className="text-muted-foreground truncate max-w-[140px]">
                        {i.product.name} ×{i.quantity}
                      </span>
                      <span className="font-medium flex-shrink-0">
                        {formatPrice(i.product.price * i.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {selectedItems.length > 0 && (
                  <div className="border-t border-border pt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Envío</span>
                      <span className={freeShipping ? "text-green-600 font-semibold" : ""}>
                        {freeShipping ? "Gratis" : formatPrice(shippingCost)}
                      </span>
                    </div>
                    {!freeShipping && subtotal > 0 && (
                      <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
                        Agrega {formatPrice(300000 - subtotal)} más para envío gratis
                      </p>
                    )}
                  </div>
                )}

                <div className="border-t border-border pt-3 flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(total)}</span>
                </div>

                {error && (
                  <p className="text-sm text-red-500 bg-red-50 rounded-xl p-3">{error}</p>
                )}

                <Button
                  size="lg"
                  className="w-full h-14 rounded-2xl font-semibold text-base"
                  onClick={handlePay}
                  disabled={isLoading || selectedItems.length === 0}
                >
                  {isLoading ? (
                    <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2" /> Procesando...</>
                  ) : (
                    <><Zap className="w-5 h-5 mr-2" /> Pagar {formatPrice(total)}</>
                  )}
                </Button>

                {selectedItems.length === 0 && (
                  <p className="text-xs text-center text-muted-foreground">
                    Selecciona al menos un producto para continuar
                  </p>
                )}

                {/* Trust signals */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>Pago 100% seguro con Wompi</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Truck className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>Envío gratis en compras &gt; $300.000</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <RotateCcw className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>Garantía de satisfacción</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
