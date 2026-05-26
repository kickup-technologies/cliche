"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { X, Plus, Minus, ShoppingBag, Trash2, ArrowRight, Sparkles, Truck, PartyPopper } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/context/cart-context"
import type { Product } from "@/lib/supabase"

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(price)
}

export function CartDrawer() {
  const { items, removeItem, updateQuantity, total, itemCount, checkout, isCheckingOut, isDrawerOpen, closeDrawer } = useCart()
  const [recommendations, setRecommendations] = useState<Product[]>([])

  // Cargar recomendaciones — productos que NO están en el carrito
  useEffect(() => {
    if (!isDrawerOpen) return
    fetch("/api/products")
      .then((r) => r.json())
      .then((all: Product[]) => {
        const inCart = new Set(items.map((i) => i.product.id))
        const recs = all.filter((p) => !inCart.has(p.id) && p.stock > 0).slice(0, 3)
        setRecommendations(recs)
      })
      .catch(() => {})
  }, [isDrawerOpen, items])

  // Bloquear scroll al abrir
  useEffect(() => {
    document.body.style.overflow = isDrawerOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [isDrawerOpen])

  if (!isDrawerOpen) return null

  const { addItem } = useCart()

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
        onClick={closeDrawer}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-[420px] bg-background z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <h2 className="font-serif text-lg font-bold text-foreground">
              Tu carrito
              {itemCount > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">({itemCount} producto{itemCount !== 1 ? "s" : ""})</span>
              )}
            </h2>
          </div>
          <button
            onClick={closeDrawer}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
              <ShoppingBag className="w-14 h-14 text-muted-foreground/30 mb-4" />
              <p className="font-semibold text-foreground mb-1">Tu carrito está vacío</p>
              <p className="text-sm text-muted-foreground mb-6">Descubre nuestros aromas y encuentra el tuyo.</p>
              <Button onClick={closeDrawer} variant="outline" asChild>
                <Link href="/#productos">Explorar productos</Link>
              </Button>
            </div>
          ) : (
            <div className="px-6 py-4 space-y-4">
              {/* Cart items */}
              {items.map(({ product, quantity }) => (
                <div key={product.id} className="flex gap-4 py-3 border-b border-border/50 last:border-0">
                  <div className="w-18 h-18 bg-muted/40 rounded-xl overflow-hidden flex-shrink-0 w-[72px] h-[72px]">
                    <Image
                      src={product.image_url || "/images/placeholder.jpg"}
                      alt={product.name}
                      width={72}
                      height={72}
                      className="w-full h-full object-contain p-1"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-tight">{product.name}</p>
                    <p className="text-sm font-bold text-primary mt-1">{formatPrice(product.price)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center border border-border rounded-lg overflow-hidden">
                        <button
                          onClick={() => updateQuantity(product.id, quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-muted transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center text-sm font-medium">{quantity}</span>
                        <button
                          onClick={() => updateQuantity(product.id, quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-muted transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(product.id)}
                        className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors ml-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Recommendations */}
              {recommendations.length > 0 && (
                <div className="pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">Completa tu ritual</p>
                  </div>
                  <div className="space-y-3">
                    {recommendations.map((rec) => (
                      <div key={rec.id} className="flex items-center gap-3 bg-muted/30 rounded-xl p-3">
                        <div className="w-12 h-12 bg-background rounded-lg overflow-hidden flex-shrink-0">
                          <Image
                            src={rec.image_url || "/images/placeholder.jpg"}
                            alt={rec.name}
                            width={48}
                            height={48}
                            className="w-full h-full object-contain p-1"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground leading-tight truncate">{rec.name}</p>
                          <p className="text-xs text-primary font-bold mt-0.5">{formatPrice(rec.price)}</p>
                        </div>
                        <button
                          onClick={() => addItem(rec)}
                          className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center hover:bg-accent transition-colors flex-shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-border px-6 py-5 space-y-4 bg-background">
            {/* Barra envío gratis */}
            {(() => {
              const FREE_SHIPPING = 300000
              const remaining = Math.max(0, FREE_SHIPPING - total)
              const progress = Math.min(100, (total / FREE_SHIPPING) * 100)
              return (
                <div className="space-y-1.5">
                  {remaining > 0 ? (
                    <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                      Agrega <span className="font-bold text-foreground">{formatPrice(remaining)}</span> más y tu envío es <span className="font-bold text-green-600 flex items-center gap-0.5"><Truck className="w-3 h-3" />GRATIS</span>
                    </p>
                  ) : (
                    <p className="text-xs text-center font-semibold text-green-600 flex items-center justify-center gap-1"><PartyPopper className="w-3.5 h-3.5" />¡Tienes envío gratis!</p>
                  )}
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )
            })()}
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="text-lg font-bold text-foreground">{formatPrice(total)}</span>
            </div>
            <Button
              size="lg"
              className="w-full h-13 text-base font-semibold"
              onClick={() => { checkout(); closeDrawer() }}
              disabled={isCheckingOut}
            >
              {isCheckingOut ? "PROCESANDO..." : (
                <>PROCEDER AL PAGO <ArrowRight className="ml-2 w-4 h-4" /></>
              )}
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
