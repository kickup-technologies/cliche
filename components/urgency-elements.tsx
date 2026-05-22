"use client"

import { useState, useEffect } from "react"
import { ShoppingBag, Flame, Clock, MapPin, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/context/cart-context"
import type { Promotion } from "@/lib/supabase"

// ─── Compras recientes simuladas (social proof) ───────────────────────────────
const purchases = [
  { name: "Valentina R.", city: "Bogotá",      product: "Difusor Nebulizador Bambú",   rating: 5, time: "Hace 2 min",  color: "bg-[#EDD5CF]" },
  { name: "Camila M.",   city: "Medellín",     product: "Kit Armonía x3",              rating: 5, time: "Hace 5 min",  color: "bg-[#D9B5AC]" },
  { name: "Sofía L.",    city: "Cali",         product: "Aroma Lavanda Premium",        rating: 5, time: "Hace 8 min",  color: "bg-[#C4958A]" },
  { name: "Daniela P.",  city: "Cartagena",    product: "Vela Aromática Eucalipto",     rating: 4, time: "Hace 11 min", color: "bg-[#EDD5CF]" },
  { name: "Isabella T.", city: "Barranquilla", product: "Difusor Nebulizador Bambú",    rating: 5, time: "Hace 14 min", color: "bg-[#D9B5AC]" },
]

// ─── Social Proof Toast ───────────────────────────────────────────────────────
export function SocialProofToast() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const showNext = () => {
      setIsVisible(true)
      setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => {
          setCurrentIndex((i) => (i + 1) % purchases.length)
        }, 400)
      }, 4500)
    }

    const initial = setTimeout(showNext, 8000)
    const interval = setInterval(showNext, 13000)
    return () => { clearTimeout(initial); clearInterval(interval) }
  }, [])

  const p = purchases[currentIndex]

  return (
    <div className={`fixed bottom-28 left-4 z-40 transition-all duration-500 ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"}`}>
      <div className="bg-card border border-border/60 rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 max-w-[280px]">
        {/* Product color swatch */}
        <div className={`w-12 h-12 ${p.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <ShoppingBag className="w-5 h-5 text-[#2D1A14]/60" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 mb-0.5">
            <p className="text-xs font-semibold text-foreground">{p.name}</p>
            <span className="text-muted-foreground/40 text-xs">·</span>
            <div className="flex items-center gap-0.5">
              <MapPin className="w-2.5 h-2.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{p.city}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-tight truncate">
            Compró <span className="font-medium text-foreground">{p.product}</span>
          </p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex">
              {Array.from({ length: p.rating }).map((_, i) => (
                <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground">{p.time}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Badge de stock bajo (conectado a stock real) ─────────────────────────────
export function UrgencyBadge({ stock }: { stock: number }) {
  if (stock > 10) return null
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
      <span className="text-orange-600 font-semibold">
        ¡Solo quedan {stock} unidades!
      </span>
    </div>
  )
}

// ─── Countdown Timer (conectado a promociones reales de Supabase) ─────────────
export function CountdownTimer({ endTime }: { endTime: Date }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const tick = () => {
      const diff = endTime.getTime() - Date.now()
      if (diff <= 0) { setExpired(true); return }
      setTimeLeft({
        hours:   Math.floor(diff / 3_600_000),
        minutes: Math.floor((diff % 3_600_000) / 60_000),
        seconds: Math.floor((diff % 60_000) / 1000),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endTime])

  if (expired) return null

  const pad = (n: number) => String(n).padStart(2, "0")

  return (
    <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-full text-sm font-medium">
      <Clock className="w-4 h-4" />
      <span>Oferta termina en:</span>
      <span className="font-mono font-bold">
        {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
      </span>
    </div>
  )
}

// ─── Sticky Add to Cart (con countdown y carrito real) ────────────────────────
export function StickyAddToCart() {
  const [isVisible, setIsVisible] = useState(false)
  const [promotion, setPromotion] = useState<Promotion | null>(null)
  const { itemCount, checkout, isCheckingOut, openDrawer } = useCart()

  // Mostrar al hacer scroll
  useEffect(() => {
    const onScroll = () => setIsVisible(window.scrollY > 600)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Cargar promoción activa
  useEffect(() => {
    fetch("/api/promotions")
      .then((r) => r.json())
      .then((promos: Promotion[]) => {
        const active = promos.find((p) => p.end_time !== null)
        if (active) setPromotion(active)
      })
      .catch(console.error)
  }, [])

  if (!isVisible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border p-4 animate-in slide-in-from-bottom duration-300">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="hidden sm:block">
          {promotion?.end_time ? (
            <CountdownTimer endTime={(() => {
              // Cap al máximo medianoche esta noche — evita mostrar "719 horas"
              const promoEnd = new Date(promotion.end_time!)
              const tonightMidnight = new Date()
              tonightMidnight.setHours(23, 59, 59, 0)
              return promoEnd > tonightMidnight ? tonightMidnight : promoEnd
            })()} />
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Oferta especial</p>
              <p className="font-semibold text-foreground">30% OFF + Envío Gratis</p>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 flex-1 sm:flex-none justify-end">
          {itemCount > 0 && (
            <span className="text-sm text-muted-foreground">
              {itemCount} {itemCount === 1 ? "producto" : "productos"} en carrito
            </span>
          )}
          <Button
            size="lg"
            className="font-semibold px-8"
            onClick={() => itemCount > 0 ? openDrawer() : undefined}
            disabled={isCheckingOut || itemCount === 0}
          >
            <ShoppingBag className="w-5 h-5 mr-2" />
            {isCheckingOut ? "PROCESANDO..." : itemCount > 0 ? `VER CARRITO (${itemCount})` : "COMPRAR AHORA"}
          </Button>
        </div>
      </div>
    </div>
  )
}
