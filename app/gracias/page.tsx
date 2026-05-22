"use client"

import { Suspense } from "react"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, ShoppingBag, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

function GraciasContent() {
  const params = useSearchParams()
  const sessionId = params.get("session_id")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Dar tiempo a que el webhook procese
    const t = setTimeout(() => setLoading(false), 2000)
    return () => clearTimeout(t)
  }, [])

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {loading ? (
          <div className="animate-pulse">
            <div className="w-20 h-20 bg-primary/20 rounded-full mx-auto mb-6" />
            <div className="h-6 bg-muted rounded w-48 mx-auto mb-3" />
            <div className="h-4 bg-muted rounded w-64 mx-auto" />
          </div>
        ) : (
          <>
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-foreground mb-3">
              ¡Gracias por tu compra! 🌿
            </h1>
            <p className="text-muted-foreground mb-6">
              Tu pedido fue confirmado. Revisa tu correo — te enviamos los detalles y número de seguimiento.
            </p>

            <div className="bg-muted/50 rounded-2xl p-6 mb-8 space-y-3 text-left">
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
              <p className="text-xs text-muted-foreground mb-6">
                Pedido #{sessionId.slice(-8).toUpperCase()}
              </p>
            )}

            <Button asChild size="lg" className="w-full">
              <Link href="/">Seguir comprando</Link>
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
