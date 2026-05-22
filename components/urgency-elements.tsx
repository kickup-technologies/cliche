"use client"

import { useState, useEffect } from "react"
import { ShoppingBag, Flame, Clock, MapPin, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/context/cart-context"

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

function formatPriceCOP(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n)
}

// ─── Sticky bar inteligente ────────────────────────────────────────────────────
// Comportamiento:
//   · Carrito vacío < 90s  → oculto (no molestar a los que acaban de llegar)
//   · Carrito vacío ≥ 90s  → nudge sutil de social proof, sin timer falso
//   · Carrito con items    → resumen real del carrito + "Finalizar compra"
//   · Timer de urgencia    → solo aparece si: tiene items + lleva ≥4 min + no lo ha visto hoy
export function StickyAddToCart() {
  const [isScrolled, setIsScrolled]       = useState(false)
  const [browseSeconds, setBrowseSeconds] = useState(0)
  const [showUrgency, setShowUrgency]     = useState(false)
  const { items, itemCount, total, checkout, isCheckingOut, openDrawer } = useCart()

  const firstItem = items[0]

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 500)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Contador real de tiempo en página
  useEffect(() => {
    const id = setInterval(() => setBrowseSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // Urgencia contextual: solo una vez por día, solo si tiene items y lleva ≥4 min
  useEffect(() => {
    if (itemCount === 0 || browseSeconds < 240) return
    const today = new Date().toDateString()
    if (localStorage.getItem("cliche_urgency_seen") !== today) {
      setShowUrgency(true)
      localStorage.setItem("cliche_urgency_seen", today)
    }
  }, [itemCount, browseSeconds])

  if (!isScrolled) return null

  // ── Sin items: invisible < 90s; social proof ≥ 90s ──────────────────────────
  if (itemCount === 0) {
    if (browseSeconds < 90) return null
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/40 animate-in slide-in-from-bottom duration-500">
        <div className="container mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <div className="flex -space-x-1.5">
              {["bg-[#C4958A]","bg-[#EDD5CF]","bg-[#D9B5AC]"].map((c, i) => (
                <div key={i} className={`w-5 h-5 rounded-full ${c} border-2 border-background`} />
              ))}
            </div>
            <span className="hidden sm:inline">
              +5.000 hogares ya tienen su aroma · <span className="font-medium text-foreground">Envío gratis en compras +$300k</span>
            </span>
            <span className="sm:hidden font-medium text-foreground">+5.000 hogares · Envío gratis</span>
          </div>
          <Button size="sm" variant="outline" className="shrink-0 rounded-full h-8 px-4 text-xs font-semibold" asChild>
            <a href="#productos">Ver aromas →</a>
          </Button>
        </div>
      </div>
    )
  }

  // ── Con items: resumen real + checkout ───────────────────────────────────────
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/98 backdrop-blur-md border-t border-border animate-in slide-in-from-bottom duration-300">
      <div className="container mx-auto px-4 py-3 flex items-center gap-3">
        {/* Resumen del carrito */}
        <div className="flex-1 min-w-0">
          {showUrgency ? (
            <p className="text-xs text-amber-700 font-semibold">
              Código BIENVENIDA20 vence hoy — 20% OFF activo en tu pedido
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {itemCount} {itemCount === 1 ? "producto" : "productos"} en tu carrito
            </p>
          )}
          <p className="text-sm font-bold text-foreground truncate">
            {firstItem?.product.name}
            {itemCount > 1 && <span className="text-muted-foreground font-normal"> + {itemCount - 1} más</span>}
            <span className="ml-2 text-primary">{formatPriceCOP(total)}</span>
          </p>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={openDrawer}
            className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Ver carrito
          </button>
          <Button
            size="default"
            className="font-semibold px-5 rounded-full"
            onClick={checkout}
            disabled={isCheckingOut}
          >
            <ShoppingBag className="w-4 h-4 mr-1.5" />
            {isCheckingOut ? "Procesando..." : "Finalizar compra"}
          </Button>
        </div>
      </div>
    </div>
  )
}
