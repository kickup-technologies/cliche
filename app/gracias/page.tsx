"use client"

import { Suspense } from "react"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  CheckCircle, ShoppingBag, Mail, Sparkles, ArrowRight,
  Tag, Share2, Star, Copy, Check, XCircle, RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/context/cart-context"
import { useCAPI } from "@/lib/use-capi"

interface ReferralData {
  code: string
  discount_percent: number
}

const FAILED_STATUSES = ["DECLINED", "ERROR", "VOIDED"]

function GraciasContent() {
  const params = useSearchParams()
  const sessionId = params.get("reference") || params.get("session_id")
  const status = params.get("status")
  const router = useRouter()
  const { clearCart } = useCart()
  const { track } = useCAPI()
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [refCopied, setRefCopied] = useState(false)
  const [referral, setReferral] = useState<ReferralData | null>(null)

  const isFailed = status && FAILED_STATUSES.includes(status.toUpperCase())

  useEffect(() => {
    if (!isFailed) {
      clearCart()
    }
  }, [isFailed]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isFailed) {
      setLoading(false)
      return
    }
    // Simulate loading + fetch referral code if session exists
    const t = setTimeout(async () => {
      if (sessionId) {
        // ── Meta Pixel + CAPI: Purchase event (deduplicado por pedido) ──
        try {
          const fired = sessionStorage.getItem(`purchase_fired_${sessionId}`)
          if (!fired) {
            const ordRes = await fetch(`/api/orders/${sessionId}`)
            if (ordRes.ok) {
              const order = await ordRes.json()
              const items = (order.items as Array<{ product_id: string; quantity: number }>) || []
              track({
                event_name: "Purchase",
                custom_data: {
                  currency: "COP",
                  value: Number(order.total) || 0,
                  content_ids: items.map((i) => i.product_id),
                  content_type: "product",
                  num_items: items.reduce((n, i) => n + (i.quantity || 1), 0),
                },
                // Advanced Matching — el servidor los hashea con SHA-256
                // antes de enviarlos a Meta (nunca van crudos a Facebook)
                user_data: {
                  ...(order.customer_email && { raw_email: order.customer_email }),
                  ...(order.customer_phone && { raw_phone: order.customer_phone }),
                },
              })
              sessionStorage.setItem(`purchase_fired_${sessionId}`, "1")
            }
          }
        } catch {
          // silent — el tracking no debe romper la página de gracias
        }

        try {
          const res = await fetch("/api/referral/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId }),
          })
          if (res.ok) {
            const d = await res.json()
            setReferral(d)
          }
        } catch {
          // silent — referral is a nice-to-have
        }
      }
      setLoading(false)
    }, 1500)
    return () => clearTimeout(t)
  }, [sessionId, isFailed]) // eslint-disable-line react-hooks/exhaustive-deps

  function copyCode() {
    navigator.clipboard.writeText("RITUAL15")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function copyReferral() {
    if (!referral) return
    navigator.clipboard.writeText(referral.code)
    setRefCopied(true)
    setTimeout(() => setRefCopied(false), 2000)
  }

  const shareText = referral
    ? `Descubrí Cliché Aromas y huele increíble. Usa mi código ${referral.code} y obtén ${referral.discount_percent}% OFF en tu primera compra → https://clichearomas.com`
    : ""

  function shareWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank")
  }

  if (isFailed) {
    return (
      <main className="min-h-screen bg-[#FAF8F5] flex items-center justify-center py-16 px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="font-serif text-3xl font-light text-[#2D1A14] mb-3">Pago no procesado</h1>
          <p className="text-[#2D1A14]/50 text-sm leading-relaxed mb-8">
            Tu pago no pudo completarse. No se realizó ningún cobro. Puedes intentarlo de nuevo con otro método de pago.
          </p>
          <button
            onClick={() => router.push("/checkout")}
            className="inline-flex items-center gap-2 bg-[#A67163] hover:bg-[#8B5E52] text-white font-semibold px-8 py-3.5 rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Intentar de nuevo
          </button>
        </div>
      </main>
    )
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
                <div className="flex flex-col sm:flex-row gap-3 justify-center mb-2">
                  <p className="text-xs text-muted-foreground">
                    Pedido #{sessionId.slice(-8).toUpperCase()}
                  </p>
                  <Link
                    href={`/pedido/${sessionId}`}
                    className="text-xs font-semibold text-primary hover:underline underline-offset-2"
                  >
                    Seguir mi pedido →
                  </Link>
                </div>
              )}
            </div>

            {/* Google Review CTA */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 mb-5 flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-400" />
                </div>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground text-sm mb-1">¿Ya te gustó la experiencia?</p>
                <p className="text-xs text-muted-foreground mb-3">Una reseña en Google nos ayuda a llegar a más hogares colombianos. ¡Solo toma 30 segundos!</p>
                <a
                  href="https://g.page/r/CLICHE_AROMAS_GOOGLE_PLACE_ID/review"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 text-xs font-bold px-4 py-2 rounded-xl transition-colors"
                >
                  <Star className="w-3.5 h-3.5 fill-yellow-900" />
                  Dejar reseña en Google
                </a>
              </div>
            </div>

            {/* Referral program */}
            {referral && (
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-3xl p-6 mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <Share2 className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-widest text-primary">Comparte y gana</span>
                </div>
                <h2 className="text-lg font-serif font-bold text-foreground mb-1">
                  Tu código de referido
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Comparte este código con amigos. Ellos obtienen <strong>{referral.discount_percent}% OFF</strong> y tú acumulas beneficios con cada compra referida.
                </p>

                <div className="bg-background rounded-xl p-4 mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary" />
                    <span className="font-mono font-bold text-lg text-foreground tracking-widest">{referral.code}</span>
                  </div>
                  <button
                    onClick={copyReferral}
                    className="flex items-center gap-1 text-xs font-semibold text-primary underline underline-offset-2 hover:text-primary/70 transition-colors"
                  >
                    {refCopied ? <><Check className="w-3 h-3" /> Copiado</> : <><Copy className="w-3 h-3" /> Copiar</>}
                  </button>
                </div>

                <button
                  onClick={shareWhatsApp}
                  className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Compartir por WhatsApp
                </button>
              </div>
            )}

            {/* Upsell — Completa tu ritual */}
            <div className="bg-card border border-border rounded-3xl p-6 mb-6">
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
              <div className="bg-muted/50 rounded-xl p-4 mb-4 flex items-center justify-between">
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
                  className="flex items-center gap-1 text-xs font-semibold text-primary underline underline-offset-2 hover:text-primary/70 transition-colors"
                >
                  {copied ? <><Check className="w-3 h-3" /> ¡Copiado!</> : <><Copy className="w-3 h-3" /> Copiar</>}
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
