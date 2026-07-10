"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import Lenis from "lenis"

/**
 * SmoothScroll — scroll sedoso global con Lenis (ref: floema.com).
 * Configuración contenida: lerp suave pero sin "flotar" demasiado,
 * para que la página se sienta lujosa sin marear. Respeta
 * prefers-reduced-motion desactivándose por completo.
 *
 * Desactivado en el panel admin: Lenis captura la rueda/trackpad para
 * animar el scroll de la PÁGINA, lo que rompe el scroll nativo de los
 * contenedores internos (sidebar, panel de detalle de pedido). El panel
 * es una UI de aplicación — ahí manda el scroll nativo del navegador.
 */
export function SmoothScroll() {
  const pathname = usePathname()
  const isAdminArea = pathname?.startsWith("/admin") ?? false

  useEffect(() => {
    if (isAdminArea) return
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
      delete (window as unknown as { __lenis?: Lenis }).__lenis
    }
  }, [isAdminArea])

  return null
}
