"use client"

import { useState, useEffect, useCallback } from "react"
import { ShoppingBag, Flame, Clock, X, Star, Check, Droplets, Leaf, Wind, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/context/cart-context"

// ─── Social proof con compras REALES (vía /api/recent-purchases) ──────────────
interface RealPurchase { name: string; city: string; product: string; minAgo: number }

// Asigna icono/color según el nombre del producto comprado
function iconForProduct(product: string) {
  const p = product.toLowerCase()
  if (p.includes("agua"))   return { icon: Droplets, color: "text-blue-500",   bg: "bg-blue-50" }
  if (p.includes("aire"))   return { icon: Wind,     color: "text-sky-500",    bg: "bg-sky-50" }
  if (p.includes("tierra")) return { icon: Globe,    color: "text-amber-600",  bg: "bg-amber-50" }
  if (p.includes("fuego"))  return { icon: Flame,    color: "text-orange-500", bg: "bg-orange-50" }
  return { icon: Leaf, color: "text-green-600", bg: "bg-green-50" } // kits y otros
}

// ─── Social Proof Toast — top-right, non-invasive ─────────────────────────────
export function SocialProofToast() {
  const [purchases, setPurchases] = useState<RealPurchase[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const dismiss = useCallback(() => {
    setIsVisible(false)
    setDismissed(true)
  }, [])

  // Cargar compras reales (anonimizadas). Si no hay, el toast no se muestra.
  useEffect(() => {
    fetch("/api/recent-purchases")
      .then((r) => r.json())
      .then((d) => setPurchases(Array.isArray(d.purchases) ? d.purchases : []))
      .catch(() => setPurchases([]))
  }, [])

  useEffect(() => {
    if (dismissed || purchases.length === 0) return

    const showNext = () => {
      setIsVisible(true)
      setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => {
          setCurrentIndex((i) => (i + 1) % purchases.length)
        }, 500)
      }, 3800)
    }

    // Primera aparición: 12s después de cargar (el usuario ya vio algo)
    const initial = setTimeout(showNext, 12000)
    // Siguientes: cada 20s (poco frecuente = no invasivo)
    const interval = setInterval(showNext, 20000)
    return () => { clearTimeout(initial); clearInterval(interval) }
  }, [dismissed, purchases])

  // No mostrar nada si no hay compras reales (evita inventar social proof)
  if (dismissed || purchases.length === 0) return null

  const base = purchases[currentIndex]
  const p = { ...base, ...iconForProduct(base.product) }

  return (
    // Posición: top-right debajo del header — no interfiere con sticky bar ni WhatsApp
    <div
      className={`fixed top-[72px] right-3 z-40 transition-all duration-500 max-w-[260px] ${
        isVisible ? "opacity-100 translate-x-0 pointer-events-auto" : "opacity-0 translate-x-8 pointer-events-none"
      }`}
    >
      <div className="bg-white/95 backdrop-blur-md border border-border/40 rounded-2xl shadow-lg px-3.5 py-2.5 flex items-center gap-2.5">
        {/* Product icon */}
        <div className={`w-9 h-9 ${p.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <p.icon className={`w-4 h-4 ${p.color}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-foreground leading-tight">
            {p.name} · <span className="text-muted-foreground font-normal">{p.city}</span>
          </p>
          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">
            Compró <span className="font-semibold text-foreground">{p.product}</span>
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-2 h-2 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="text-[9px] text-muted-foreground">Hace {p.minAgo} min</span>
          </div>
        </div>
        {/* Dismiss */}
        <button
          onClick={dismiss}
          className="p-1 hover:bg-muted rounded-full transition-colors flex-shrink-0 ml-0.5"
          aria-label="Cerrar"
        >
          <X className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}

// ─── Badge de stock bajo ──────────────────────────────────────────────────────
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

// ─── Countdown Timer ──────────────────────────────────────────────────────────
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
export function StickyAddToCart() {
  const [isScrolled, setIsScrolled]       = useState(false)
  const [browseSeconds, setBrowseSeconds] = useState(0)
  const [showUrgency, setShowUrgency]     = useState(false)
  const [discountPct, setDiscountPct]     = useState(10)
  const [discountCode, setDiscountCode]   = useState("BIENVENIDA10")
  const [addedFeedback, setAddedFeedback] = useState(false)
  const { items, itemCount, total, checkout, isCheckingOut, openDrawer } = useCart()

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => { setDiscountPct(d.discount_percentage); setDiscountCode(d.discount_code) })
      .catch(() => {})
  }, [])

  const firstItem = items[0]

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 400)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

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

  // Feedback visual al agregar item
  const prevCount = useState(itemCount)[0]
  useEffect(() => {
    if (itemCount > prevCount) {
      setAddedFeedback(true)
      setTimeout(() => setAddedFeedback(false), 1500)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemCount])

  if (!isScrolled) return null

  // ── Sin items: social proof nudge sutil después de 90s ───────────────────────
  if (itemCount === 0) {
    if (browseSeconds < 90) return null
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/30 animate-in slide-in-from-bottom duration-500">
        <div className="container mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex -space-x-1.5">
              {["bg-[#C4958A]","bg-[#EDD5CF]","bg-[#D9B5AC]"].map((c, i) => (
                <div key={i} className={`w-5 h-5 rounded-full ${c} border-2 border-background`} />
              ))}
            </div>
            <span className="hidden sm:inline text-xs">
              +5.000 hogares · <span className="font-semibold text-foreground">Envío gratis +$300k</span>
            </span>
            <span className="sm:hidden text-xs font-medium text-foreground">+5.000 hogares · Envío gratis +$300k</span>
          </div>
          <Button size="sm" className="shrink-0 rounded-full h-8 px-4 text-xs font-semibold" asChild>
            <a href="#productos">Ver aromas →</a>
          </Button>
        </div>
      </div>
    )
  }

  // ── Con items: resumen real + checkout ───────────────────────────────────────
  return (
    <div className={`fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md border-t animate-in slide-in-from-bottom duration-300 ${
      addedFeedback ? "bg-primary/10 border-primary/30" : "bg-card/98 border-border"
    }`}>
      <div className="container mx-auto px-4 py-3 flex items-center gap-3">
        {/* Resumen */}
        <div className="flex-1 min-w-0">
          {addedFeedback ? (
            <p className="text-xs text-primary font-semibold flex items-center gap-1">
              <Check className="w-3 h-3" /> ¡Agregado al carrito!
            </p>
          ) : showUrgency ? (
            <p className="text-xs text-amber-700 font-semibold">
              Código {discountCode} · {discountPct}% OFF activo
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
            className="hidden sm:block text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Ver carrito
          </button>
          <Button
            size="sm"
            className="font-semibold px-4 rounded-full h-9"
            onClick={checkout}
            disabled={isCheckingOut}
          >
            <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
            {isCheckingOut ? "..." : "Finalizar compra"}
          </Button>
        </div>
      </div>
    </div>
  )
}
