"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

/**
 * ScrollFade — reveal sutil ligado al scroll (Opción B). Cada bloque entra
 * desde abajo y sale hacia arriba con un leve translate + fade según su
 * posición en el viewport. Solo usa transform/opacity, así que NO reorganiza
 * el layout (el bloque conserva su espacio y spacing exactos).
 */
export function ScrollFade({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [s, setS] = useState<{ opacity: number; ty: number }>({ opacity: 0, ty: 28 })

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setS({ opacity: 1, ty: 0 })
      return
    }
    let ticking = false
    const update = () => {
      ticking = false
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      const raw = (r.top + r.height / 2 - vh / 2) / (vh / 2) // -1 (arriba) .. 0 (centro) .. 1 (abajo)
      const d = Math.max(-1, Math.min(1, raw)) // acotado: el translate nunca supera ±34px
      setS({ opacity: 1 - Math.abs(d) * 0.6, ty: d * 34 })
    }
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update) } }
    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
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
