"use client"

import { useState, useEffect } from "react"
import { X, AlertTriangle, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCart } from "@/context/cart-context"

export function ExitIntentPopup() {
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [discountCode, setDiscountCode] = useState("QUEDATЕ15")
  const { items } = useCart()

  useEffect(() => {
    const hasSeenExit = sessionStorage.getItem("cliche-exit-seen")
    if (hasSeenExit) return

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        setIsOpen(true)
        sessionStorage.setItem("cliche-exit-seen", "true")
        document.removeEventListener("mouseout", handleMouseLeave)
      }
    }

    // Solo mostrar si tiene items en el carrito O después de 10s
    const timer = setTimeout(() => {
      document.addEventListener("mouseout", handleMouseLeave)
    }, 10000)

    return () => {
      clearTimeout(timer)
      document.removeEventListener("mouseout", handleMouseLeave)
    }
  }, [])

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
    } catch {
      console.error("Subscribe error")
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleClose}
      />
      <div className="relative bg-card rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-in zoom-in-95 fade-in duration-300">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 hover:bg-muted rounded-full transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-primary" />
        </div>

        {!isSubmitted ? (
          <>
            <h3 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-3">
              ¡Espera!
            </h3>
            <p className="text-lg text-muted-foreground mb-2">
              {items.length > 0
                ? "Tienes productos en tu carrito 🛒"
                : "No te vayas con las manos vacías"}
            </p>
            <p className="text-foreground font-semibold text-lg mb-6">
              Deja tu correo y recibe{" "}
              <span className="text-primary bg-primary/10 px-2 py-1 rounded">15% OFF</span>{" "}
              ahora mismo
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                type="email"
                placeholder="Tu correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 text-center"
              />
              <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={isLoading}>
                <ShoppingBag className="w-5 h-5 mr-2" />
                {isLoading ? "Enviando..." : "OBTENER 15% OFF"}
              </Button>
            </form>

            <button
              onClick={handleClose}
              className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              No gracias, prefiero pagar precio completo
            </button>
          </>
        ) : (
          <>
            <h3 className="text-2xl font-serif font-bold text-foreground mb-3">¡Perfecto!</h3>
            <p className="text-muted-foreground mb-4">Tu código de descuento es:</p>
            <div className="bg-primary/10 rounded-xl px-6 py-4 mb-6">
              <p className="text-3xl font-bold text-primary tracking-widest">{discountCode}</p>
              <p className="text-xs text-muted-foreground mt-2">Válido por las próximas 24 horas</p>
            </div>
            <Button onClick={handleClose} className="w-full h-12 font-semibold">
              <ShoppingBag className="w-5 h-5 mr-2" />
              APLICAR Y SEGUIR COMPRANDO
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
