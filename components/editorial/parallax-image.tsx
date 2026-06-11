"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"

interface ParallaxImageProps {
  src: string
  alt: string
  /** factor de velocidad relativa: 0.15 = sutil, 0.3 = notorio */
  speed?: number
}

/**
 * ParallaxImage — imagen full-bleed con doble efecto premium (ref: floema.com):
 * 1. Clip-path reveal: la imagen se descubre como un telón al entrar al viewport.
 * 2. Parallax: se desplaza más lento que el scroll, creando profundidad.
 * La imagen se renderiza ~30% más alta que el contenedor para que el parallax
 * nunca deje bordes vacíos. Respeta prefers-reduced-motion.
 */
export function ParallaxImage({ src, alt, speed = 0.18 }: ParallaxImageProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLDivElement>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const wrap = wrapRef.current
    const img = imgRef.current
    if (!wrap || !img) return

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) {
      setRevealed(true)
      return
    }

    let ticking = false
    let shown = false

    const update = () => {
      ticking = false
      const r = wrap.getBoundingClientRect()
      const vh = window.innerHeight

      if (!shown && r.top < vh * 0.85) {
        shown = true
        setRevealed(true)
      }

      // progreso del elemento a través del viewport: -1 (abajo) → 1 (arriba)
      const progress = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2)
      img.style.transform = `translateY(${progress * speed * 100}px)`
    }

    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(update)
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll, { passive: true })
    requestAnimationFrame(update)

    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [speed])

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0 overflow-hidden"
      style={{
        clipPath: revealed ? "inset(0% 0 0 0)" : "inset(100% 0 0 0)",
        transition: "clip-path 1.1s cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      {/* contenedor sobredimensionado para el parallax */}
      <div ref={imgRef} className="absolute -inset-y-[15%] inset-x-0 will-change-transform">
        <Image src={src} alt={alt} fill sizes="100vw" className="object-cover" />
      </div>
    </div>
  )
}
