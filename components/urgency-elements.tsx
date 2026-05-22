"use client"

import { useState, useEffect } from "react"
import { ShoppingCart, Flame, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/context/cart-context"
import type { Promotion } from "@/lib/supabase"

// ─── Compras recientes simuladas (social proof) ───────────────────────────────
const purchases = [
  { name: "Valentina R.", city: "Bogotá",    product: "Difusor Nebulizador Bambu", time: "Hace 2 minutos" },
  { name: "Camila M.",   city: "Medellín",   product: "Kit Relajación Completo",   time: "Hace 5 minutos" },
  { name: "Sofía L.",    city: "Cali",       product: "Esencia Lavanda Premium",   time: "Hace 8 minutos" },
  { name: "Daniela P.",  city: "Cartagena",  product: "Vela Aromática Eucalipto",  time: "Hace 12 minutos" },
  { name: "Isabella T.", city: "Barranquilla", product: "Difusor Nebulizador Bambu", time: "Hace 15 minutos" },
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
        }, 500)
      }, 4000)
    }

    const initial = setTimeout(showNext, 8000)
    const interval = setInterval(showNext, 12000)
    return () => { clearTimeout(initial); clearInterval(interval) }
  }, [])

  const p = purchases[currentIndex]

  return (
    <div className={`fixed bottom-24 left-4 z-40 transition-all duration-500 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
      <div className="bg-card border border-border rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 max-w-xs">
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
          <ShoppingCart className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {p.name} de {p.city}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            compró <span className="font-medium text-foreground">{p.product}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{p.time}</p>
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
  const { itemCount, checkout, isCheckingOut } = useCart()

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
            <CountdownTimer endTime={new Date(promotion.end_time)} />
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
            onClick={() => checkout(promotion?.code)}
            disabled={isCheckingOut || itemCount === 0}
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            {isCheckingOut ? "PROCESANDO..." : itemCount > 0 ? "PAGAR AHORA" : "COMPRAR AHORA"}
          </Button>
        </div>
      </div>
    </div>
  )
}
