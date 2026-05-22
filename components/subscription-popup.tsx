"use client"

import { useState, useEffect } from "react"
import { X, Gift, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Image from "next/image"

export function SubscriptionPopup() {
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [discountCode, setDiscountCode] = useState("PRIMERA20")

  useEffect(() => {
    const hasSeenPopup = sessionStorage.getItem("cliche-popup-seen")
    if (hasSeenPopup) return
    const timer = setTimeout(() => setIsOpen(true), 5000)
    return () => clearTimeout(timer)
  }, [])

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={handleClose} />
      <div className="relative bg-card rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 fade-in duration-300">
        <button onClick={handleClose} className="absolute top-4 right-4 z-10 p-2 bg-white/80 hover:bg-white rounded-full transition-colors" aria-label="Cerrar popup">
          <X className="w-5 h-5 text-foreground" />
        </button>

        <div className="grid md:grid-cols-2">
          <div className="relative h-48 md:h-full min-h-[200px]">
            <Image src="/images/hero-main.jpg" alt="Cliché Aromas" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>

          <div className="p-6 md:p-8">
            {!isSubmitted ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Gift className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-primary uppercase tracking-wide">Oferta exclusiva</span>
                </div>
                <h3 className="text-2xl font-serif font-bold text-foreground mb-2">Obtén 20% OFF</h3>
                <p className="text-muted-foreground mb-6">
                  en tu primera compra. Suscríbete y recibe ofertas exclusivas, lanzamientos y tips de aromaterapia.
                </p>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <Input
                    type="email"
                    placeholder="Tu correo electrónico"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12"
                  />
                  <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={isLoading}>
                    {isLoading ? "Enviando..." : "OBTENER MI 20% OFF"}
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground mt-4 text-center">Sin spam. Cancela cuando quieras.</p>
                <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-border">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">+5,000 suscriptores felices</span>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gift className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-foreground mb-2">¡Listo!</h3>
                <p className="text-muted-foreground mb-4">Revisa tu correo para obtener tu código.</p>
                <div className="bg-primary/10 rounded-xl px-4 py-3">
                  <p className="text-xs text-muted-foreground mb-1">TU CÓDIGO</p>
                  <p className="text-2xl font-bold text-primary tracking-widest">{discountCode}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
