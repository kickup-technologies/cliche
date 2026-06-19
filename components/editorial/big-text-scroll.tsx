"use client"

import { useEffect, useRef } from "react"
import { AromaShader } from "@/components/editorial/aroma-shader"

interface BigTextScrollProps {
  text?: string
  /** desplazamiento horizontal como fracción del ancho del viewport */
  travel?: number
}

/**
 * BigTextScroll — titular gigante que se desplaza horizontalmente ligado al
 * scroll (ref: floema.com, Jacquemus). El texto serif outline cruza la banda
 * más lento que el scroll vertical, creando una pausa editorial entre
 * secciones. Respeta prefers-reduced-motion.
 */
export function BigTextScroll({
  text = "Aromas que transforman",
  travel = 0.22,
}: BigTextScrollProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const el = textRef.current
    if (!wrap || !el) return

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) return

    let ticking = false

    const update = () => {
      ticking = false
      const r = wrap.getBoundingClientRect()
      const vh = window.innerHeight
      const vw = window.innerWidth
      // progreso -1 (entrando por abajo) → 1 (saliendo por arriba), acotado
      const raw = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2)
      const progress = Math.max(-1, Math.min(1, raw))
      // la primera copia queda perfectamente centrada cuando la banda
      // cruza el centro del viewport; el travel orbita ese punto
      const first = el.firstElementChild as HTMLElement | null
      const center = first ? (vw - first.offsetWidth) / 2 : 0
      el.style.transform = `translateX(${center - progress * travel * vw}px)`
    }

    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(update)
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll, { passive: true })
    // posición inicial síncrona — rAF no corre en pestañas ocultas
    update()

    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [travel])

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className="relative overflow-hidden bg-background py-14 sm:py-20 md:py-28"
    >
      {/* humo aromático líquido — shader WebGL detrás del titular */}
      <AromaShader className="absolute inset-0 h-full w-full" />

      <div
        ref={textRef}
        className="relative z-10 flex w-max items-baseline gap-10 whitespace-nowrap will-change-transform"
      >
        <span className="font-serif text-[2.3rem] font-medium leading-none text-foreground sm:text-[3.4rem] md:text-[6.5rem]">
          {text}
        </span>
        <span
          className="font-serif text-[2.3rem] font-medium leading-none text-transparent sm:text-[3.4rem] md:text-[6.5rem]"
          style={{ WebkitTextStroke: "1px #3d2c22" }}
        >
          {text}
        </span>
      </div>
    </div>
  )
}
