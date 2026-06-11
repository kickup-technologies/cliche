"use client"

import { useEffect, useRef, ReactNode } from "react"

interface ScrollRevealProps {
  children: ReactNode
  className?: string
  /** delay en ms — para stagger manual entre hermanos */
  delay?: number
  /** distancia de entrada en px */
  distance?: number
}

/**
 * Envuelve cualquier sección y la anima al entrar al viewport.
 * Usa un chequeo de posición rAF-throttled en lugar de IntersectionObserver
 * para cubrir también saltos instantáneos (anclas, restauración de scroll),
 * donde IO no dispara callbacks. El listener se elimina tras revelar.
 */
export function ScrollReveal({
  children,
  className = "",
  delay = 0,
  distance = 48,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) return

    el.style.opacity = "0"
    el.style.transform = `translateY(${distance}px)`
    el.style.transition = `opacity 0.75s ease, transform 0.75s cubic-bezier(0.22,1,0.36,1)`
    el.style.transitionDelay = `${delay}ms`

    let revealed = false
    let ticking = false

    const reveal = () => {
      revealed = true
      el.style.opacity = "1"
      el.style.transform = "translateY(0)"
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }

    const check = () => {
      ticking = false
      if (revealed) return
      const r = el.getBoundingClientRect()
      if (r.top < window.innerHeight * 0.88) reveal()
    }

    const onScroll = () => {
      if (!ticking && !revealed) {
        ticking = true
        requestAnimationFrame(check)
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll, { passive: true })
    // chequeo inicial — cubre contenido sobre el fold y scroll restaurado
    requestAnimationFrame(check)

    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [delay, distance])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
