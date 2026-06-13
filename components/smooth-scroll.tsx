"use client"

import { useEffect } from "react"
import Lenis from "lenis"

/**
 * SmoothScroll — scroll sedoso global con Lenis (ref: floema.com).
 * Configuración contenida: lerp suave pero sin "flotar" demasiado,
 * para que la página se sienta lujosa sin marear. Respeta
 * prefers-reduced-motion desactivándose por completo.
 */
export function SmoothScroll() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) return

    const lenis = new Lenis({
      lerp: 0.1,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    })
    // Instancia accesible para scroll programático (anclas, devtools)
    ;(window as unknown as { __lenis?: Lenis }).__lenis = lenis

    let raf = 0
    const loop = (time: number) => {
      lenis.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
    }
  }, [])

  return null
}
