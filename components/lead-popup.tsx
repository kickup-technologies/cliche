"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { X, CheckCircle, Leaf, Heart, Rabbit, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCart } from "@/context/cart-context"
import { useCAPI } from "@/lib/use-capi"

/**
 * LeadPopup — captura de correo para el newsletter (SIN código de descuento:
 * se eliminó el 2026-07-30 por decisión del negocio). El gancho ahora es
 * contenido: ideas de marketing olfativo y acceso anticipado a lanzamientos.
 *
 * Diseño: tarjeta VERTICAL con la foto de MAHAI de fondo a sangre completa y el
 * texto superpuesto sobre la zona crema (izquierda). Optimizado para móvil
 * (la mayoría del tráfico).
 *
 * Frecuencia: aparece UNA vez por SESIÓN nueva, a todo el que NO se haya
 * suscrito (no por 30 días). Quien ya se suscribió no lo vuelve a ver.
 * No aparece en checkout/gracias/admin.
 */
const SESSION_KEY = "cliche_lead_seen"   // por sesión
const SUB_KEY = "cliche_subscribed"      // persistente (no volver a mostrar)

const CREMA = "#FAF8F5"
const CAFE = "#2D1A14"
const TERRA = "#A67163"

function seenThisSession(): boolean {
  try { return sessionStorage.getItem(SESSION_KEY) === "1" } catch { return false }
}
function isSubscribed(): boolean {
  try { return localStorage.getItem(SUB_KEY) === "1" } catch { return false }
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
  const { items } = useCart()
  const { track } = useCAPI()
  const armed = useRef(false)

  const blocked = !!pathname && (
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/gracias") ||
    pathname.startsWith("/admin") ||
    // Fichas de producto: el popup interrumpía justo cuando la persona está
    // decidiendo la compra (feedback del cliente, 2026-08-26).
    pathname.startsWith("/productos")
  )

  const open = useCallback(() => {
    if (armed.current || seenThisSession() || isSubscribed()) return
    armed.current = true
    setIsOpen(true)
    try { sessionStorage.setItem(SESSION_KEY, "1") } catch {}
    track({ event_name: "ViewContent", custom_data: { content_name: "lead_popup" } })
  }, [track])

  useEffect(() => {
    // Previsualizar a demanda: ?popup=1
    if (new URLSearchParams(window.location.search).get("popup") === "1") {
      setIsOpen(true)
      return
    }
    if (blocked || seenThisSession() || isSubscribed()) return

    // El timer se ARMA solo tras el primer gesto (scroll/tap/tecla): el popup a
    // los 7s "en frío" pintaba un elemento gigante tardío que Lighthouse tomaba
    // como LCP (17s en PSI móvil, medido 2026-08-26). Tras una interacción real
    // el LCP ya quedó finalizado y el popup no penaliza la métrica.
    let timer: ReturnType<typeof setTimeout> | undefined
    const arm = () => {
      if (timer === undefined) timer = setTimeout(open, 7000)
    }
    const gestures: (keyof WindowEventMap)[] = ["scroll", "pointerdown", "touchstart", "keydown"]
    gestures.forEach((g) => window.addEventListener(g, arm, { passive: true, once: true }))
    // Extra PC: intención de salir (mouse fuera por arriba).
    const onMouseOut = (e: MouseEvent) => { if (e.clientY <= 0) open() }
    document.addEventListener("mouseout", onMouseOut)
    // Extra: al pasar el 30% de la página (antes 45%).
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (max > 0 && window.scrollY / max > 0.3) open()
    }
    window.addEventListener("scroll", onScroll, { passive: true })

    return () => {
      clearTimeout(timer)
      gestures.forEach((g) => window.removeEventListener(g, arm))
      document.removeEventListener("mouseout", onMouseOut)
      window.removeEventListener("scroll", onScroll)
    }
  }, [blocked, open])

  // Bloquear el scroll del fondo mientras el popup está abierto (incluye Lenis).
  useEffect(() => {
    if (!isOpen) return
    const lenis = (window as unknown as { __lenis?: { stop: () => void; start: () => void } }).__lenis
    lenis?.stop()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      lenis?.start()
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen])

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
      await res.json().catch(() => ({}))
      setSubmitted(true)
      try { localStorage.setItem(SUB_KEY, "1") } catch {}
      track({ event_name: "Lead", custom_data: { content_name: "lead_popup" }, user_data: { raw_email: email } })
    } catch {
      setSubmitted(true)
      try { localStorage.setItem(SUB_KEY, "1") } catch {}
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4" data-lenis-prevent>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />

      {/* Tarjeta VERTICAL: foto de fondo + texto encima de la zona crema */}
      <div className="relative w-full max-w-[400px] overflow-hidden rounded-3xl shadow-2xl">
        {/* Foto de fondo */}
        <Image
          src="/images/popup-mahai.png"
          alt="Aroma MAHAI de Cliché"
          fill
          sizes="400px"
          className="object-cover"
          style={{ objectPosition: "center" }}
          priority
        />
        {/* Velo crema a la izquierda para legibilidad del texto */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(100deg, rgba(250,248,245,0.97) 0%, rgba(250,248,245,0.92) 42%, rgba(250,248,245,0.45) 64%, rgba(250,248,245,0) 82%)" }} />

        <button
          onClick={close}
          aria-label="Cerrar"
          className="absolute right-3 top-3 z-20 rounded-full p-2 transition-colors hover:bg-black/10"
          style={{ color: CAFE }}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Contenido (define la altura de la tarjeta) */}
        <div className="relative flex max-h-[90vh] flex-col overflow-y-auto overscroll-contain px-6 py-7 sm:px-8 sm:py-9">
          {!submitted ? (
            <div className="max-w-[72%] sm:max-w-[70%]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo-cliche.png" alt="Cliché" className="mb-4 h-8 w-auto object-contain" />

              <h3 className="font-serif font-medium leading-[1.08]" style={{ color: CAFE, fontSize: "clamp(1.75rem, 7vw, 2.4rem)" }}>
                {items.length > 0 ? "No dejes tu aroma a medias." : "Descubre el aroma que tu marca merece."}
              </h3>

              <p className="mt-3 text-[13px] leading-relaxed sm:text-sm" style={{ color: `${CAFE}B0` }}>
                Suscríbete y recibe <span className="font-bold" style={{ color: TERRA }}>ideas de marketing olfativo</span>,
                novedades de la casa y acceso a los lanzamientos antes que nadie.
              </p>

              <form onSubmit={submit} className="mt-5 space-y-2.5">
                <Input
                  type="email"
                  inputMode="email"
                  placeholder="Tu correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 rounded-xl bg-white/90 text-sm"
                />
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-11 w-full rounded-xl text-sm font-bold tracking-wide"
                  style={{ backgroundColor: TERRA, color: CREMA }}
                >
                  {loading ? "Enviando…" : "Suscribirme"}
                </Button>
              </form>

              {/* Sellos de confianza */}
              <div className="mt-5 flex items-start gap-4">
                {TRUST.map(({ Icon, label }) => (
                  <div key={label} className="flex w-[64px] flex-col items-center gap-1 text-center">
                    <Icon className="h-5 w-5" strokeWidth={1.5} style={{ color: CAFE }} />
                    <span className="text-[10px] leading-tight" style={{ color: `${CAFE}99` }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Prueba social */}
              <div className="mt-5 flex items-center gap-2.5">
                <div className="flex -space-x-2">
                  {[0, 1, 2, 3].map((n) => (
                    <span key={n} className="flex h-6 w-6 items-center justify-center rounded-full border-2" style={{ borderColor: CREMA, backgroundColor: n % 2 ? `${TERRA}33` : `${CAFE}1A` }}>
                      <User className="h-3 w-3" style={{ color: `${CAFE}99` }} />
                    </span>
                  ))}
                </div>
                <p className="text-[10.5px] leading-tight" style={{ color: `${CAFE}99` }}>
                  Únete a las marcas y negocios que eligen consciencia y bienestar.
                </p>
              </div>

              <button onClick={close} className="mt-4 self-start text-[11px]" style={{ color: `${CAFE}66` }}>
                No, gracias
              </button>
            </div>
          ) : (
            <div className="max-w-[78%] py-2">
              <div className="mb-4 flex h-13 w-13 items-center justify-center rounded-full bg-green-100" style={{ height: 52, width: 52 }}>
                <CheckCircle className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="font-serif text-3xl font-medium leading-tight" style={{ color: CAFE }}>¡Bienvenido a Cliché!</h3>
              <p className="mt-2 text-sm" style={{ color: `${CAFE}99` }}>
                Ya haces parte de la casa. Te llegarán ideas de marketing olfativo y los lanzamientos antes que nadie.
              </p>
              <Button onClick={close} className="mt-5 h-11 rounded-xl px-6 font-bold" style={{ backgroundColor: CAFE, color: CREMA }}>
                Empezar a comprar
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
