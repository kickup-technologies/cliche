"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { X, Plus, Minus, ShoppingBag, Trash2, ArrowRight, Truck, Check, ChevronDown } from "lucide-react"
import { useCart } from "@/context/cart-context"
import { useSiteSettings } from "@/lib/use-site-settings"
import { parseFreeShippingThreshold } from "@/lib/pricing"
import type { Product } from "@/lib/supabase"
import { PRODUCT_PLACEHOLDER } from "@/lib/placeholder"

// Paleta de marca (fiel al landing / checkout)
const CREAM = "#FAF8F5"
const BROWN = "#2D1A14"
const TERRA = "#A67163"

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(price)
}

export function CartDrawer() {
  const { items, removeItem, updateQuantity, total, itemCount, checkout, isCheckingOut, isDrawerOpen, closeDrawer, addItem } = useCart()
  const settings = useSiteSettings()
  const FREE_SHIPPING = parseFreeShippingThreshold(settings.free_shipping_threshold)
  const [recommendations, setRecommendations] = useState<Product[]>([])
  const [openPacks, setOpenPacks] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!isDrawerOpen) return
    fetch("/api/products")
      .then((r) => r.json())
      .then((all: Product[]) => {
        if (!Array.isArray(all)) return
        const inCart = new Set(items.map((i) => i.product.id))
        setRecommendations(all.filter((p) => !inCart.has(p.id) && p.stock > 0).slice(0, 3))
      })
      .catch(() => {})
  }, [isDrawerOpen, items])

  // Bloqueo de scroll del fondo a prueba de balas: fijamos el body con
  // position:fixed para que la rueda/trackpad nunca mueva el landing detrás,
  // sin importar dónde esté el cursor. Restauramos la posición al cerrar.
  useEffect(() => {
    if (!isDrawerOpen) return
    const scrollY = window.scrollY
    const body = document.body
    body.style.position = "fixed"
    body.style.top = `-${scrollY}px`
    body.style.left = "0"
    body.style.right = "0"
    body.style.width = "100%"
    body.style.overflow = "hidden"
    return () => {
      body.style.position = ""
      body.style.top = ""
      body.style.left = ""
      body.style.right = ""
      body.style.width = ""
      body.style.overflow = ""
      window.scrollTo(0, scrollY)
    }
  }, [isDrawerOpen])

  if (!isDrawerOpen) return null

  const remaining = Math.max(0, FREE_SHIPPING - total)
  const progress = Math.min(100, (total / FREE_SHIPPING) * 100)

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={closeDrawer}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full w-full max-w-[440px] z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 ease-out"
        style={{ background: CREAM }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-6 border-b" style={{ borderColor: `${BROWN}12` }}>
          <div>
            <h2 className="font-serif text-xl font-light" style={{ color: BROWN }}>Tu carrito</h2>
            <p className="text-[10px] tracking-[0.25em] uppercase mt-0.5" style={{ color: `${BROWN}40` }}>
              {itemCount > 0 ? `${itemCount} artículo${itemCount !== 1 ? "s" : ""}` : "Vacío"}
            </p>
          </div>
          <button
            onClick={closeDrawer}
            aria-label="Cerrar"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-[#2D1A14]/5"
          >
            <X className="w-4 h-4" style={{ color: BROWN }} />
          </button>
        </div>

        {/* Content — data-lenis-prevent: Lenis ignora la rueda aquí y deja el scroll nativo */}
        <div className="flex-1 overflow-y-auto overscroll-contain" data-lenis-prevent>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center px-8 animate-in fade-in duration-500">
              <ShoppingBag className="w-9 h-9 mb-5 opacity-30" style={{ color: TERRA }} />
              <p className="font-serif text-2xl font-light mb-2" style={{ color: BROWN }}>Tu carrito está vacío</p>
              <p className="text-sm mb-8 max-w-[240px] leading-relaxed" style={{ color: `${BROWN}50` }}>
                Descubre nuestra colección de aromas y encuentra el que transforma tu espacio.
              </p>
              <Link
                href="/catalogo"
                onClick={closeDrawer}
                className="inline-flex items-center gap-2 border text-sm font-medium px-8 py-3 rounded-full transition-colors duration-300 hover:text-[#FAF8F5]"
                style={{ borderColor: BROWN, color: BROWN }}
                onMouseEnter={(e) => (e.currentTarget.style.background = BROWN)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                Explorar colección
              </Link>
            </div>
          ) : (
            <div className="px-7 py-5">
              {items.map(({ product, quantity, pack }, idx) => (
                <div
                  key={product.id}
                  className="flex gap-4 py-5 border-b last:border-0 animate-in fade-in slide-in-from-right-2 duration-300"
                  style={{ borderColor: `${BROWN}08`, animationDelay: `${idx * 60}ms`, animationFillMode: "both" }}
                >
                  <div className="w-[76px] h-[76px] flex-shrink-0 overflow-hidden" style={{ background: `${BROWN}08` }}>
                    <Image
                      src={product.image_url || PRODUCT_PLACEHOLDER}
                      alt={product.name}
                      width={76}
                      height={76}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-[15px] leading-snug" style={{ color: BROWN }}>{product.name}</p>
                    <p className="text-sm font-medium mt-1" style={{ color: TERRA }}>{formatPrice(product.price)}</p>

                    {/* Kit personalizado: desplegar los frascos elegidos */}
                    {pack && pack.components.length > 0 && (
                      <div className="mt-2">
                        <button
                          onClick={() => setOpenPacks((p) => ({ ...p, [product.id]: !p[product.id] }))}
                          className="flex items-center gap-1 text-[11px] font-medium transition-colors hover:opacity-70"
                          style={{ color: TERRA }}
                        >
                          {openPacks[product.id] ? "Ocultar" : "Ver"} los {pack.units} frascos
                          <ChevronDown className={`h-3 w-3 transition-transform ${openPacks[product.id] ? "rotate-180" : ""}`} />
                        </button>
                        {openPacks[product.id] && (
                          <ul className="mt-1.5 space-y-1 border-l pl-3" style={{ borderColor: `${BROWN}15` }}>
                            {pack.components.map((c, ci) => (
                              <li key={ci} className="flex items-center justify-between text-[11px]" style={{ color: `${BROWN}99` }}>
                                <span className="truncate pr-2">{c.name}</span>
                                <span style={{ color: `${BROWN}55` }}>x{c.quantity}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-3">
                      <div className="flex items-center border" style={{ borderColor: `${BROWN}15` }}>
                        <button
                          onClick={() => updateQuantity(product.id, quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center transition-colors hover:bg-[#2D1A14]/5"
                          style={{ color: `${BROWN}60` }}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm" style={{ color: BROWN }}>{quantity}</span>
                        <button
                          onClick={() => updateQuantity(product.id, quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center transition-colors hover:bg-[#2D1A14]/5"
                          style={{ color: `${BROWN}60` }}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(product.id)}
                        aria-label="Eliminar"
                        className="w-8 h-8 flex items-center justify-center ml-auto transition-colors text-[#2D1A14]/25 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Recomendaciones */}
              {recommendations.length > 0 && (
                <div className="pt-6 mt-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.25em] mb-4" style={{ color: `${BROWN}40` }}>
                    Completa tu colección
                  </p>
                  <div className="space-y-3">
                    {recommendations.map((rec) => (
                      <div key={rec.id} className="flex items-center gap-3">
                        <div className="w-11 h-11 flex-shrink-0 overflow-hidden" style={{ background: `${BROWN}08` }}>
                          <Image src={rec.image_url || PRODUCT_PLACEHOLDER} alt={rec.name} width={44} height={44} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-serif text-[13px] leading-tight truncate" style={{ color: BROWN }}>{rec.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: TERRA }}>{formatPrice(rec.price)}</p>
                        </div>
                        <button
                          onClick={() => addItem(rec)}
                          aria-label="Agregar"
                          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white transition-transform hover:scale-105 active:scale-95"
                          style={{ background: TERRA }}
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
          <div className="border-t px-7 py-6 space-y-4" style={{ borderColor: `${BROWN}12`, background: CREAM }}>
            {/* Barra envío gratis */}
            <div className="space-y-2">
              {remaining > 0 ? (
                <p className="text-[11px] text-center" style={{ color: `${BROWN}55` }}>
                  Agrega <span className="font-semibold" style={{ color: BROWN }}>{formatPrice(remaining)}</span> más y el envío es{" "}
                  <span className="font-semibold inline-flex items-center gap-0.5" style={{ color: TERRA }}><Truck className="w-3 h-3" />gratis</span>
                </p>
              ) : (
                <p className="text-[11px] text-center font-semibold inline-flex items-center justify-center gap-1 w-full" style={{ color: TERRA }}>
                  <Check className="w-3.5 h-3.5" /> ¡Tienes envío gratis!
                </p>
              )}
              <div className="h-[3px] w-full overflow-hidden rounded-full" style={{ background: `${BROWN}10` }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: TERRA }} />
              </div>
            </div>

            <div className="flex justify-between items-baseline pt-1">
              <span className="text-[11px] tracking-[0.2em] uppercase" style={{ color: `${BROWN}45` }}>Subtotal</span>
              <span className="font-serif text-2xl font-light" style={{ color: BROWN }}>{formatPrice(total)}</span>
            </div>

            <button
              onClick={() => { sessionStorage.setItem("checkout-back-url", window.location.pathname + window.location.search); checkout(); closeDrawer() }}
              disabled={isCheckingOut}
              className="group w-full h-14 rounded-full flex items-center justify-center gap-2 text-white text-sm font-semibold tracking-wide transition-all duration-200 active:scale-[0.99] disabled:opacity-50"
              style={{ background: TERRA }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#8B5E52")}
              onMouseLeave={(e) => (e.currentTarget.style.background = TERRA)}
            >
              {isCheckingOut ? "Procesando..." : (
                <>Proceder al pago <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></>
              )}
            </button>
            <p className="text-[10px] text-center tracking-wide" style={{ color: `${BROWN}30` }}>
              Pago cifrado · Envío a todo Colombia
            </p>
          </div>
        )}
      </div>
    </>
  )
}
