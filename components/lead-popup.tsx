"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { X, Sparkles, CheckCircle, Copy, Leaf, Heart, Rabbit, User } from "lucide-react"
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
 *  - Diseño split (foto MAHAI + copy de valor), colores de marca.
 */
const STORAGE_KEY = "cliche_lead_popup"
const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000 // 30 días
const FALLBACK_CODE = "BIENVENIDA20"

const CREMA = "#FAF8F5"
const CAFE = "#2D1A14"
const TERRA = "#A67163"

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

const TRUST = [
  { Icon: Leaf, label: "Ingredientes naturales" },
  { Icon: Heart, label: "Hecho con propósito" },
  { Icon: Rabbit, label: "Libre de crueldad" },
]

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

  const blocked = !!pathname && (
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/gracias") ||
    pathname.startsWith("/admin")
  )

  const open = useCallback(() => {
    if (armed.current || recentlyHandled()) return
    armed.current = true
    setIsOpen(true)
    markHandled()
    track({ event_name: "ViewContent", custom_data: { content_name: "lead_popup" } })
  }, [track])

  useEffect(() => {
    // Forzar apertura para previsualizar: añade ?popup=1 a la URL.
    if (new URLSearchParams(window.location.search).get("popup") === "1") {
      setIsOpen(true)
      return
    }
    if (blocked || recentlyHandled()) return

    const isDesktop = window.matchMedia("(min-width: 768px)").matches

    const onMouseOut = (e: MouseEvent) => { if (e.clientY <= 0) open() }
    let armDesktop: ReturnType<typeof setTimeout> | undefined
    if (isDesktop) {
      armDesktop = setTimeout(() => document.addEventListener("mouseout", onMouseOut), 15000)
    }

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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />

      <div
        className="relative flex w-full max-h-[94vh] flex-col overflow-hidden rounded-t-3xl shadow-2xl sm:max-h-[88vh] sm:max-w-4xl sm:flex-row sm:rounded-3xl"
        style={{ backgroundColor: CREMA }}
      >
        {/* Cerrar */}
        <button
          onClick={close}
          aria-label="Cerrar"
          className="absolute right-3 top-3 z-20 rounded-full bg-black/10 p-2 text-[#2D1A14] backdrop-blur-sm transition-colors hover:bg-black/20 sm:bg-transparent sm:text-[#2D1A14]/60 sm:hover:bg-black/5"
        >
          <X className="h-5 w-5" />
        </button>

        {/* ── Lado contenido ── */}
        <div className="order-2 flex flex-col justify-center overflow-y-auto px-6 py-7 sm:order-1 sm:w-[56%] sm:px-10 sm:py-12">
          {!submitted ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo-cliche.png" alt="Cliché" className="mb-5 h-9 w-auto object-contain" />

              <h3 className="font-serif text-3xl font-medium leading-[1.08] sm:text-[2.6rem]" style={{ color: CAFE }}>
                {items.length > 0 ? "No dejes tu aroma a medias." : "Descubre el ritual que tu hogar merece."}
              </h3>

              <p className="mt-4 text-sm leading-relaxed sm:text-[0.95rem]" style={{ color: `${CAFE}B0` }}>
                Suscríbete y recibe un <span className="font-bold" style={{ color: TERRA }}>20% OFF</span> en tu primera
                compra, además de acceso anticipado a lanzamientos y tips para un hogar con su propio aroma.
              </p>

              <form onSubmit={submit} className="mt-6 space-y-3">
                <Input
                  type="email"
                  inputMode="email"
                  placeholder="Tu correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 rounded-xl text-sm"
                />
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full rounded-xl text-sm font-bold tracking-wide"
                  style={{ backgroundColor: TERRA, color: CREMA }}
                >
                  {loading ? "Enviando…" : "Quiero mi 20% OFF"}
                </Button>
              </form>

              {/* Sellos de confianza */}
              <div className="mt-6 flex items-start justify-between gap-2 sm:justify-start sm:gap-7">
                {TRUST.map(({ Icon, label }) => (
                  <div key={label} className="flex max-w-[31%] flex-col items-center gap-1.5 text-center sm:max-w-[88px]">
                    <Icon className="h-5 w-5" strokeWidth={1.5} style={{ color: CAFE }} />
                    <span className="text-[10.5px] leading-tight" style={{ color: `${CAFE}99` }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Prueba social */}
              <div className="mt-6 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {[0, 1, 2, 3].map((n) => (
                    <span
                      key={n}
                      className="flex h-7 w-7 items-center justify-center rounded-full border-2"
                      style={{ borderColor: CREMA, backgroundColor: n % 2 ? `${TERRA}33` : `${CAFE}1A` }}
                    >
                      <User className="h-3.5 w-3.5" style={{ color: `${CAFE}99` }} />
                    </span>
                  ))}
                </div>
                <p className="text-[11px] leading-tight" style={{ color: `${CAFE}99` }}>
                  Únete a <span className="font-semibold" style={{ color: CAFE }}>+5.000 personas</span> que eligen
                  consciencia y bienestar.
                </p>
              </div>

              <button onClick={close} className="mt-4 self-start text-[11px] transition-colors" style={{ color: `${CAFE}66` }}>
                No, gracias
              </button>
            </>
          ) : (
            <div className="py-4 text-center sm:text-left">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 sm:mx-0">
                <CheckCircle className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="font-serif text-3xl font-medium" style={{ color: CAFE }}>¡Listo! Te llegó por correo</h3>
              <p className="mt-2 text-sm" style={{ color: `${CAFE}99` }}>Usa este código en tu primera compra:</p>
              <button
                onClick={copy}
                className="mt-5 flex w-full items-center justify-center gap-3 rounded-xl border px-6 py-4 transition-colors"
                style={{ borderColor: `${TERRA}55`, backgroundColor: `${TERRA}12` }}
              >
                <span className="font-mono text-2xl font-bold tracking-widest" style={{ color: TERRA }}>{code}</span>
                {copied ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" style={{ color: `${TERRA}AA` }} />}
              </button>
              <Button onClick={close} className="mt-5 h-12 w-full rounded-xl font-bold" style={{ backgroundColor: CAFE, color: CREMA }}>
                Empezar a comprar
              </Button>
            </div>
          )}
        </div>

        {/* ── Lado imagen (MAHAI) ── */}
        <div className="relative order-1 h-44 w-full flex-shrink-0 sm:order-2 sm:h-auto sm:w-[44%]">
          <Image
            src="/images/popup-mahai.png"
            alt="Aroma MAHAI de Cliché"
            fill
            sizes="(max-width: 640px) 100vw, 440px"
            className="object-cover"
            style={{ objectPosition: "center" }}
            priority
          />
          {/* Fundido sutil hacia el contenido para integrar la unión */}
          <div className="absolute inset-0 hidden bg-gradient-to-r from-[#FAF8F5] via-transparent to-transparent sm:block" />
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#FAF8F5] to-transparent sm:hidden" />
        </div>
      </div>
    </div>
  )
}
