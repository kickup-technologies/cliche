"use client"

import { useState, useEffect, useCallback } from "react"
import { X, ShoppingBag, ShoppingCart, Sparkles, Leaf, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCart } from "@/context/cart-context"
import { useCAPI } from "@/lib/use-capi"

export function ExitIntentPopup() {
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [discountCode, setDiscountCode] = useState("QUEDATE15")
  const { items } = useCart()
  const { track } = useCAPI()

  const openPopup = useCallback(() => {
    // Coordinación: si CUALQUIER popup de captura ya apareció esta sesión, no mostrar otro
    const hasSeenAny = sessionStorage.getItem("cliche-exit-seen") || sessionStorage.getItem("cliche-capture-shown")
    if (hasSeenAny) return
    setIsOpen(true)
    sessionStorage.setItem("cliche-exit-seen", "true")
    sessionStorage.setItem("cliche-capture-shown", "true")
  }, [])

  useEffect(() => {
    // ── Desktop: mouse saliendo por la parte superior ──────────────────────────
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) openPopup()
    }
    const desktopTimer = setTimeout(() => {
      document.addEventListener("mouseout", handleMouseLeave)
    }, 10000)

    // ── Mobile: usuario cambia de pestaña / minimiza app ──────────────────────
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") openPopup()
    }
    document.addEventListener("visibilitychange", handleVisibility)

    // ── Mobile: scroll veloz hacia arriba = intención de salir ────────────────
    let lastY = 0
    let lastTime = Date.now()
    const handleScroll = () => {
      const currentY = window.scrollY
      const currentTime = Date.now()
      const velocity = (lastY - currentY) / Math.max(currentTime - lastTime, 1) // px/ms
      // Scroll hacia arriba > 2px/ms desde posición > 30% del documento
      if (velocity > 2 && currentY > document.documentElement.scrollHeight * 0.3) {
        openPopup()
      }
      lastY = currentY
      lastTime = currentTime
    }
    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      clearTimeout(desktopTimer)
      document.removeEventListener("mouseout", handleMouseLeave)
      document.removeEventListener("visibilitychange", handleVisibility)
      window.removeEventListener("scroll", handleScroll)
    }
  }, [openPopup])

  const handleClose = () => setIsOpen(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setIsLoading(true)
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "exit-intent" }),
      })
      const data = await res.json()
      if (data.discount_code) setDiscountCode(data.discount_code)
      setIsSubmitted(true)
      // ── Meta Pixel + CAPI: Lead (suscripción al intentar salir) ──
      track({
        event_name: "Lead",
        custom_data: { content_name: "exit_intent" },
        user_data: { raw_email: email },
      })
    } catch {
      console.error("Subscribe error")
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleClose}
      />
      {/* En móvil sale desde abajo (bottom sheet), en desktop centrado */}
      <div className="relative bg-card w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-hidden">

        {/* Franja decorativa superior */}
        <div className="h-1 bg-gradient-to-r from-primary via-[#C4958A] to-primary" />

        <div className="p-6 sm:p-8">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 hover:bg-muted rounded-full transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Handle bar para mobile */}
          <div className="w-10 h-1 bg-muted-foreground/20 rounded-full mx-auto mb-5 sm:hidden" />

          {!isSubmitted ? (
            <>
              {/* Icono */}
              <div className="flex items-center justify-center mb-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Leaf className="w-7 h-7 text-primary" />
                </div>
              </div>

              <h3 className="text-xl sm:text-2xl font-serif font-bold text-foreground mb-2 text-center">
                {items.length > 0 ? "¡Tienes productos esperándote!" : "Antes de que te vayas..."}
              </h3>

              {items.length > 0 && (
                <div className="flex items-center justify-center gap-1.5 text-sm text-primary mb-3">
                  <ShoppingCart className="w-4 h-4" />
                  <span className="font-medium">{items.length} {items.length === 1 ? "producto" : "productos"} en tu carrito</span>
                </div>
              )}

              <p className="text-muted-foreground text-sm text-center mb-5 leading-relaxed">
                Deja tu correo y te enviamos un{" "}
                <span className="font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">15% OFF</span>{" "}
                exclusivo para completar tu compra hoy.
              </p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <Input
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 text-sm"
                  autoFocus={false}
                />
                <Button type="submit" className="w-full h-12 font-bold text-sm tracking-wide" disabled={isLoading}>
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  {isLoading ? "Enviando..." : "QUIERO MI 15% OFF"}
                </Button>
              </form>

              <div className="flex items-center justify-center gap-3 mt-4 text-xs text-muted-foreground">
                <Sparkles className="w-3 h-3" />
                <span>Sin spam · Solo ofertas reales</span>
              </div>

              <button
                onClick={handleClose}
                className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                No gracias, prefiero pagar precio completo
              </button>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-xl font-serif font-bold text-foreground mb-2">¡Código enviado!</h3>
              <p className="text-sm text-muted-foreground mb-5">Revisa tu correo. Tu código exclusivo:</p>
              <div className="bg-primary/10 border border-primary/20 rounded-xl px-6 py-4 mb-5">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-widest">Tu descuento</p>
                <p className="text-3xl font-bold text-primary tracking-widest font-mono">{discountCode}</p>
                <p className="text-xs text-muted-foreground mt-2">Válido por 24 horas</p>
              </div>
              <Button onClick={handleClose} className="w-full h-12 font-bold">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Seguir comprando
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
