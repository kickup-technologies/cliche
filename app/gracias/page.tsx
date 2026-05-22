"use client"

import { Suspense } from "react"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, ShoppingBag, Mail, Sparkles, ArrowRight, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"

function GraciasContent() {
  const params = useSearchParams()
  const sessionId = params.get("session_id")
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 2000)
    return () => clearTimeout(t)
  }, [])

  function copyCode() {
    navigator.clipboard.writeText("RITUAL15")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <main className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-lg w-full mx-auto">
        {loading ? (
          <div className="animate-pulse text-center">
            <div className="w-20 h-20 bg-primary/20 rounded-full mx-auto mb-6" />
            <div className="h-6 bg-muted rounded w-48 mx-auto mb-3" />
            <div className="h-4 bg-muted rounded w-64 mx-auto" />
          </div>
        ) : (
          <>
            {/* Confirmation */}
            <div className="text-center mb-8">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-3xl font-serif font-bold text-foreground mb-3">
                ¡Gracias por tu compra!
              </h1>
              <p className="text-muted-foreground mb-6">
                Tu pedido fue confirmado. Revisa tu correo — te enviamos los detalles y número de seguimiento.
              </p>

              <div className="bg-muted/50 rounded-2xl p-5 mb-6 space-y-3 text-left">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-primary flex-shrink-0" />
                  <p className="text-sm text-foreground">Confirmación enviada a tu correo</p>
                </div>
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-5 h-5 text-primary flex-shrink-0" />
                  <p className="text-sm text-foreground">Tu pedido está siendo preparado con amor</p>
                </div>
              </div>

              {sessionId && (
                <p className="text-xs text-muted-foreground mb-4">
                  Pedido #{sessionId.slice(-8).toUpperCase()}
                </p>
              )}
            </div>

            {/* Upsell — Completa tu ritual */}
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-3xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest text-primary">Completa tu ritual</span>
              </div>
              <h2 className="text-xl font-serif font-bold text-foreground mb-1">
                Kit Elementos x4
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Las 4 fragancias emblema — Agua, Aire, Tierra y Fuego. El ritual completo para tu hogar.
              </p>

              {/* Discount code */}
              <div className="bg-background rounded-xl p-4 mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Código exclusivo por tu compra</p>
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary" />
                    <span className="font-mono font-bold text-lg text-foreground tracking-widest">RITUAL15</span>
                    <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full font-bold">-15%</span>
                  </div>
                </div>
                <button
                  onClick={copyCode}
                  className="text-xs font-semibold text-primary underline underline-offset-2 hover:text-primary/70 transition-colors"
                >
                  {copied ? "¡Copiado!" : "Copiar"}
                </button>
              </div>

              <div className="flex items-center justify-between mb-4 text-sm">
                <span className="text-muted-foreground line-through">$190.000</span>
                <span className="text-xl font-bold text-foreground">$161.500 COP</span>
              </div>

              <Button asChild size="lg" className="w-full h-12 font-semibold">
                <Link href="/productos/kit-elementos-x4">
                  Ver el kit <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>

            <Button asChild variant="outline" size="lg" className="w-full">
              <Link href="/">Seguir explorando</Link>
            </Button>
          </>
        )}
      </div>
    </main>
  )
}

export default function GraciasPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="animate-pulse max-w-md w-full text-center">
          <div className="w-20 h-20 bg-primary/20 rounded-full mx-auto mb-6" />
          <div className="h-6 bg-muted rounded w-48 mx-auto mb-3" />
          <div className="h-4 bg-muted rounded w-64 mx-auto" />
        </div>
      </main>
    }>
      <GraciasContent />
    </Suspense>
  )
}
