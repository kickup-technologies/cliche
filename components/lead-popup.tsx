"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { usePathname } from "next/navigation"
import { X, ShoppingBag, Sparkles, CheckCircle, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCart } from "@/context/cart-context"
import { useCAPI } from "@/lib/use-capi"

/**
 * LeadPopup — captura de correo a cambio de un código de descuento real.
 *
 * Filosofía "no cansón":
 *  - Aparece UNA vez y se recuerda en localStorage 30 días (no por sesión).
 *  - PC: exit-intent (mouse sale por arriba) tras 15s. Móvil: 30s o 55% scroll.
 *  - No se muestra en checkout/gracias/admin ni a quien ya lo cerró/se suscribió.
 *  - Entrega BIENVENIDA20 (existe en la BD y funciona en el checkout).
 */
const STORAGE_KEY = "cliche_lead_popup"
const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000 // 30 días
const FALLBACK_CODE = "BIENVENIDA20"

function recentlyHandled(): boolean {
  try {
    const t = Number(localStorage.getItem(STORAGE_KEY))
    return !!t && Date.now() - t < COOLDOWN_MS
  } catch {
    return false
  }
}
function markHandled() {
  try { localStorage.setItem(STORAGE_KEY, String(Date.now())) } catch {}
}

export function LeadPopup() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [code, setCode] = useState(FALLBACK_CODE)
  const { items } = useCart()
  const { track } = useCAPI()
  const armed = useRef(false)

  // Rutas donde NO debe aparecer
  const blocked = !!pathname && (
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/gracias") ||
    pathname.startsWith("/admin")
  )

  const open = useCallback(() => {
    if (armed.current || recentlyHandled()) return
    armed.current = true
    setIsOpen(true)
    markHandled() // a partir de aquí no reaparece en 30 días
    track({ event_name: "ViewContent", custom_data: { content_name: "lead_popup" } })
  }, [track])

  useEffect(() => {
    // Forzar apertura para previsualizar: añade ?popup=1 a la URL.
    if (new URLSearchParams(window.location.search).get("popup") === "1") {
      setIsOpen(true)
      return
    }
    if (blocked || recentlyHandled()) return
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // aún permitimos por tiempo, sin animaciones agresivas
    }

    const isDesktop = window.matchMedia("(min-width: 768px)").matches

    // PC: exit-intent (mouse sale por arriba), armado tras 15s
    const onMouseOut = (e: MouseEvent) => { if (e.clientY <= 0) open() }
    let armDesktop: ReturnType<typeof setTimeout> | undefined
    if (isDesktop) {
      armDesktop = setTimeout(() => document.addEventListener("mouseout", onMouseOut), 15000)
    }

    // Móvil: 30s o 55% de scroll (lo que pase primero)
    let mobileTimer: ReturnType<typeof setTimeout> | undefined
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (max > 0 && window.scrollY / max > 0.55) open()
    }
    if (!isDesktop) {
      mobileTimer = setTimeout(open, 30000)
      window.addEventListener("scroll", onScroll, { passive: true })
    }

    return () => {
      if (armDesktop) clearTimeout(armDesktop)
      if (mobileTimer) clearTimeout(mobileTimer)
      document.removeEventListener("mouseout", onMouseOut)
      window.removeEventListener("scroll", onScroll)
    }
  }, [blocked, open])

  const close = () => setIsOpen(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "popup" }),
      })
      const data = await res.json().catch(() => ({}))
      if (data?.discount_code) setCode(data.discount_code)
      setSubmitted(true)
      track({ event_name: "Lead", custom_data: { content_name: "lead_popup" }, user_data: { raw_email: email } })
    } catch {
      // si falla la red, igual mostramos el código fallback (válido)
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  const copy = () => {
    try { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch {}
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={close} />

      <div className="relative w-full overflow-hidden rounded-t-3xl bg-[#FAF8F5] shadow-2xl sm:max-w-md sm:rounded-3xl">
        <div className="h-1 bg-gradient-to-r from-[#A67163] via-[#C4958A] to-[#A67163]" />

        <div className="p-6 sm:p-8">
          <button onClick={close} aria-label="Cerrar" className="absolute right-4 top-4 rounded-full p-2 text-[#2D1A14]/40 transition-colors hover:bg-black/5 hover:text-[#2D1A14]">
            <X className="h-4 w-4" />
          </button>
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-[#2D1A14]/15 sm:hidden" />

          {!submitted ? (
            <>
              <div className="mb-4 flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#A67163]/12">
                  <Sparkles className="h-7 w-7 text-[#A67163]" />
                </div>
              </div>

              <h3 className="mb-2 text-center font-serif text-2xl font-medium text-[#2D1A14]">
                {items.length > 0 ? "¡No dejes tu carrito a medias!" : "Antes de que te vayas…"}
              </h3>

              <p className="mb-5 text-center text-sm leading-relaxed text-[#2D1A14]/70">
                Déjanos tu correo y recibe un{" "}
                <span className="rounded bg-[#A67163]/12 px-1.5 py-0.5 font-bold text-[#A67163]">20% OFF</span>{" "}
                para tu primera compra. Más aromas nuevos y tips, sin spam.
              </p>

              <form onSubmit={submit} className="space-y-3">
                <Input
                  type="email"
                  inputMode="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 text-sm"
                />
                <Button type="submit" disabled={loading} className="h-12 w-full text-sm font-bold tracking-wide">
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  {loading ? "Enviando…" : "QUIERO MI 20% OFF"}
                </Button>
              </form>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[#2D1A14]/45">
                <Sparkles className="h-3 w-3" /> Sin spam · Cancelas cuando quieras
              </div>
              <button onClick={close} className="mt-2 w-full py-1 text-xs text-[#2D1A14]/40 transition-colors hover:text-[#2D1A14]/70">
                No, gracias
              </button>
            </>
          ) : (
            <div className="py-2 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="mb-1 font-serif text-2xl font-medium text-[#2D1A14]">¡Listo! Te llegó por correo</h3>
              <p className="mb-5 text-sm text-[#2D1A14]/65">Usa este código en tu compra:</p>
              <button
                onClick={copy}
                className="mx-auto mb-5 flex w-full items-center justify-center gap-3 rounded-xl border border-[#A67163]/30 bg-[#A67163]/8 px-6 py-4 transition-colors hover:bg-[#A67163]/14"
              >
                <span className="font-mono text-2xl font-bold tracking-widest text-[#A67163]">{code}</span>
                {copied ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-[#A67163]/70" />}
              </button>
              <Button onClick={close} className="h-12 w-full font-bold">
                <ShoppingBag className="mr-2 h-4 w-4" /> Empezar a comprar
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
