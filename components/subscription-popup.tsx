"use client"

import { useState, useEffect, useCallback } from "react"
import { X, Gift, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function SubscriptionPopup() {
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [discountCode, setDiscountCode] = useState("PRIMERA20")

  const openPopup = useCallback(() => {
    const hasSeenPopup = sessionStorage.getItem("cliche-popup-seen")
    if (hasSeenPopup || isOpen) return
    setIsOpen(true)
  }, [isOpen])

  useEffect(() => {
    // Trigger 1: tiempo — 15s después (no 5s)
    const timer = setTimeout(openPopup, 15000)

    // Trigger 2: scroll depth — cuando el usuario llega al 45% de la página
    const handleScroll = () => {
      const scrollPct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)
      if (scrollPct > 0.45) {
        openPopup()
        window.removeEventListener("scroll", handleScroll)
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      clearTimeout(timer)
      window.removeEventListener("scroll", handleScroll)
    }
  }, [openPopup])

  const handleClose = () => {
    setIsOpen(false)
    sessionStorage.setItem("cliche-popup-seen", "true")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setIsLoading(true)
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "popup" }),
      })
      const data = await res.json()
      if (data.discount_code) setDiscountCode(data.discount_code)
      setIsSubmitted(true)
      setTimeout(handleClose, 3500)
    } catch {
      console.error("Error subscribing")
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleClose}
      />

      {/* Bottom sheet en mobile, modal centrado en desktop */}
      <div className="relative bg-card w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-hidden">
        {/* Franja superior premium */}
        <div className="h-[3px] bg-gradient-to-r from-[#A67163] via-[#EDD5CF] to-[#A67163]" />

        {/* Handle bar mobile */}
        <div className="w-10 h-1 bg-muted-foreground/20 rounded-full mx-auto mt-4 sm:hidden" />

        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 hover:bg-muted rounded-full transition-colors z-10"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="px-6 pt-5 pb-7">
          {!isSubmitted ? (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Gift className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-0.5">Solo por hoy</p>
                  <h3 className="text-xl font-serif font-bold text-foreground leading-tight">Obtén 20% OFF</h3>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                Suscríbete y recibe tu código exclusivo, lanzamientos anticipados y ofertas que no publicamos en redes.
              </p>

              {/* Beneficios visuales */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                {[
                  { emoji: "🚚", label: "Envío gratis" },
                  { emoji: "✅", label: "Garantía 30d" },
                  { emoji: "🌿", label: "100% natural" },
                ].map(({ emoji, label }) => (
                  <div key={label} className="bg-muted/50 rounded-xl py-2.5 flex flex-col items-center gap-1">
                    <span className="text-lg">{emoji}</span>
                    <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">{label}</span>
                  </div>
                ))}
              </div>

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
                <Button type="submit" size="lg" className="w-full font-bold tracking-wide" disabled={isLoading}>
                  {isLoading ? "Enviando..." : "QUIERO MI 20% OFF →"}
                </Button>
              </form>

              <div className="flex items-center justify-center gap-2 mt-4">
                <Sparkles className="w-3 h-3 text-muted-foreground" />
                <p className="text-[11px] text-muted-foreground">Sin spam · +5.000 suscriptores felices</p>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">🎉</div>
              <h3 className="text-xl font-serif font-bold text-foreground mb-2">¡Ya eres parte de la familia!</h3>
              <p className="text-sm text-muted-foreground mb-4">Tu código exclusivo:</p>
              <div className="bg-primary/10 border border-primary/20 rounded-xl px-6 py-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Tu código</p>
                <p className="text-2xl font-bold text-primary tracking-widest font-mono">{discountCode}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
