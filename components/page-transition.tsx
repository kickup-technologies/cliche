"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

/**
 * PageTransition — cortina de transición al entrar a una página de producto
 * (ref de movimiento: outfit.hellohello.is, paleta Cliché). Al hacer clic en
 * cualquier enlace a /productos/..., una cortina terracota sube desde abajo,
 * muestra la firma de marca y continúa hacia arriba revelando el producto.
 * Intercepta los clics globalmente (funciona en catálogo, segmentos, vitrina…)
 * y respeta clic-medio / cmd-clic / reduced-motion.
 */
// Tiempos cortos: la versión anterior (460 + 120 + 480 ms) sumaba ~1.1 s
// artificiales a CADA clic de producto — la "lentitud" que reportaban era en
// buena parte esta espera deliberada. El efecto premium se conserva.
const COVER_MS = 200
const HOLD_MS = 40
const EXIT_MS = 200

/** Dispara la cortina de transición por código y navega a `href`. */
export function navigateWithCurtain(href: string) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent("cliche:nav", { detail: { href } }))
}

export function PageTransition() {
  const router = useRouter()
  const pathname = usePathname()
  const pathRef = useRef(pathname)
  pathRef.current = pathname
  const [phase, setPhase] = useState<"idle" | "cover" | "exit">("idle")
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const target = useRef<string | null>(null)
  // Momento en que empezó a cubrir la cortina: para descontar del tiempo de
  // espera lo que la navegación ya avanzó en paralelo.
  const coverStart = useRef(0)

  // Intercepta clics a productos en toda la página
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const el = e.target as Element | null
      // No interferir con botones internos (vista rápida, añadir al carrito, etc.)
      if (el?.closest?.("button, [data-no-transition]")) return
      const a = el?.closest?.("a")
      if (!a) return
      const href = a.getAttribute("href")
      if (!href || a.getAttribute("target") === "_blank") return
      // Rutas con cortina de transición: páginas de producto y el landing ("/").
      const animated = href.startsWith("/productos/") || href === "/"
      if (!animated) return
      if (href === pathRef.current) return
      // Fase capture: interceptamos ANTES de que el <Link> de Next navegue
      e.preventDefault()
      e.stopPropagation()
      if (phaseRef.current !== "idle") return
      target.current = href
      setPhase("cover")
    }
    document.addEventListener("click", onClick, true)
    return () => document.removeEventListener("click", onClick, true)
  }, [])

  // Permite disparar la MISMA cortina por código (login / logout, etc.)
  useEffect(() => {
    const onNav = (e: Event) => {
      const href = (e as CustomEvent).detail?.href as string | undefined
      if (!href) return
      if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        router.push(href)
        return
      }
      if (phaseRef.current !== "idle") return
      target.current = href
      setPhase("cover")
    }
    window.addEventListener("cliche:nav", onNav as EventListener)
    return () => window.removeEventListener("cliche:nav", onNav as EventListener)
  }, [router])

  // La navegación arranca EN PARALELO con la cortina (antes esperaba a que
  // terminara de cubrir): la carga de la página destino corre por debajo de
  // la animación en vez de sumarse después de ella.
  useEffect(() => {
    if (phase !== "cover" || !target.current) return
    coverStart.current = performance.now()
    router.push(target.current)
    // Fallback: si el pathname destino es el mismo que el actual (p.ej. logout
    // estando ya en el inicio), el efecto de salida por pathname no dispara;
    // forzamos la salida para que la cortina no se quede pegada.
    const fb = window.setTimeout(() => setPhase((p) => (p === "cover" ? "exit" : p)), COVER_MS + HOLD_MS + 900)
    return () => clearTimeout(fb)
  }, [phase, router])

  // Cuando llega a la página destino, la cortina sale hacia arriba. Si la
  // navegación fue más rápida que la cortina (rutas prefetcheadas), esperamos
  // lo que falte para que termine de cubrir antes de salir — sin glitch.
  useEffect(() => {
    if (target.current && pathname === target.current) {
      target.current = null
      const elapsed = performance.now() - coverStart.current
      const wait = Math.max(COVER_MS + HOLD_MS - elapsed, 40)
      const t = window.setTimeout(() => setPhase("exit"), wait)
      return () => clearTimeout(t)
    }
  }, [pathname])

  // Tras salir, vuelve a reposo
  useEffect(() => {
    if (phase !== "exit") return
    const t = window.setTimeout(() => setPhase("idle"), EXIT_MS)
    return () => clearTimeout(t)
  }, [phase])

  const translateY = phase === "cover" ? "0%" : phase === "exit" ? "-100%" : "100%"
  const transition = phase === "idle" ? "none" : `transform ${phase === "exit" ? EXIT_MS : COVER_MS}ms cubic-bezier(0.76,0,0.24,1)`
  const msgVisible = phase === "cover"

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-[#A67163]"
      style={{
        transform: `translateY(${translateY})`,
        transition,
        pointerEvents: phase === "idle" ? "none" : "auto",
        willChange: "transform",
      }}
    >
      <div
        className="px-6 text-center"
        style={{
          opacity: msgVisible ? 1 : 0,
          transform: msgVisible ? "translateY(0)" : "translateY(18px)",
          transition: `opacity 520ms ease ${msgVisible ? 200 : 0}ms, transform 600ms cubic-bezier(0.22,1,0.36,1) ${msgVisible ? 200 : 0}ms`,
        }}
      >
        <p className="mb-5 text-[0.58rem] font-semibold uppercase tracking-[0.42em] text-white/65 md:text-[0.62rem]">
          Marketing Olfativo
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logo-cliche.png"
          alt="Cliché"
          className="mx-auto h-24 w-auto object-contain brightness-0 invert md:h-32"
        />
        <div className="mx-auto my-5 h-px w-10 bg-white/40" />
        <p className="text-[0.62rem] uppercase tracking-[0.34em] text-white/70 md:text-xs">
          Tu aroma, tu marca
        </p>
      </div>
    </div>
  )
}
