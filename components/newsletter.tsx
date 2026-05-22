"use client"

import { useState } from "react"
import Image from "next/image"
import { ArrowRight, Check, Gift, Users, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollAnimation } from "@/components/scroll-animation"

export function Newsletter() {
  const [email, setEmail] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [discountCode, setDiscountCode] = useState("PRIMERA20")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setIsLoading(true)
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "newsletter" }),
      })
      const data = await res.json()
      if (data.discount_code) setDiscountCode(data.discount_code)
      setIsSubmitted(true)
    } catch {
      console.error("Error subscribing")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto max-w-5xl">
        <ScrollAnimation>
          <div className="bg-card rounded-3xl overflow-hidden shadow-lg border border-border">
            <div className="grid md:grid-cols-2 gap-0">
              <div className="relative h-56 md:h-auto min-h-[220px]">
                <Image src="/images/newsletter-bg.jpg" alt="Suscríbete" fill className="object-cover" />
                <div className="absolute inset-0 bg-primary/40 flex items-center justify-center">
                  <div className="text-center text-white p-6">
                    <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-90" />
                    <p className="text-2xl font-serif font-bold">Únete a nuestra comunidad</p>
                  </div>
                </div>
              </div>

              <div className="p-8 md:p-12 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-3">
                  <Gift className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-primary uppercase tracking-wide">Regalo de bienvenida</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-3">
                  20% OFF en tu primera compra
                </h2>
                <p className="text-muted-foreground mb-6 text-sm">
                  Suscríbete y recibe tu código de descuento al instante, más tips de aromaterapia y lanzamientos exclusivos.
                </p>

                {!isSubmitted ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input
                        type="email"
                        placeholder="Tu correo electrónico"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="flex-1 h-14 px-6 rounded-xl border-border bg-card focus:border-primary text-base"
                        required
                      />
                      <Button
                        type="submit"
                        size="lg"
                        className="h-14 px-8 rounded-xl text-base font-semibold"
                        disabled={isLoading}
                      >
                        {isLoading ? "Enviando..." : (
                          <>OBTENER 20% OFF <ArrowRight className="ml-2 h-5 w-5" /></>
                        )}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="bg-primary/10 rounded-2xl p-6 text-center">
                    <Check className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="font-semibold text-foreground mb-1">¡Suscrito exitosamente!</p>
                    <p className="text-sm text-muted-foreground mb-3">Tu código de descuento:</p>
                    <p className="text-2xl font-bold text-primary tracking-widest">{discountCode}</p>
                    <p className="text-xs text-muted-foreground mt-2">También lo enviamos a tu correo</p>
                  </div>
                )}

                <div className="flex items-center gap-4 mt-6 pt-6 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      <strong className="text-foreground">+5,000</strong> suscriptores
                    </span>
                  </div>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-sm text-muted-foreground">Sin spam. Cancela cuando quieras.</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollAnimation>
      </div>
    </section>
  )
}
