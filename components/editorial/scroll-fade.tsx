"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

/**
 * ScrollFade — animación de entrada/salida ligada al scroll, con una ZONA
 * CENTRAL amplia donde el bloque está 100% visible (opacidad 1, sin desplazar)
 * para poder leerlo completo. Cerca de los bordes del viewport: la que sale
 * sube y desaparece, la que llega entra desde abajo y aparece.
 *
 * Usa un loop de requestAnimationFrame (no eventos 'scroll') porque el smooth
 * scroll (Lenis) no emite eventos nativos fiables. Solo transform/opacity → no
 * reorganiza el layout.
 */
const PLATEAU = 0.5 // mitad central del recorrido: totalmente visible
const TRAVEL = 90 // px de desplazamiento al desvanecer (sube al salir / entra desde abajo)

export function ScrollFade({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [s, setS] = useState<{ opacity: number; ty: number }>({ opacity: 0, ty: TRAVEL })

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setS({ opacity: 1, ty: 0 })
      return
    }
    let raf = 0
    let lastO = -1
    let lastT = -999
    const loop = () => {
      const el = ref.current
      if (el) {
        const r = el.getBoundingClientRect()
        const vh = window.innerHeight
        const d = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / (vh / 2)))
        const edge = Math.max(0, (Math.abs(d) - PLATEAU) / (1 - PLATEAU))
        const o = 1 - edge * 0.95
        const t = Math.sign(d) * edge * TRAVEL
        if (Math.abs(o - lastO) > 0.008 || Math.abs(t - lastT) > 0.4) {
          lastO = o
          lastT = t
          setS({ opacity: o, ty: t })
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{ opacity: s.opacity, transform: `translateY(${s.ty}px)`, willChange: "opacity, transform" }}
    >
      {children}
    </div>
  )
}
