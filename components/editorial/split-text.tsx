"use client"

import { useEffect, useRef, useState } from "react"

interface SplitTextProps {
  text: string
  className?: string
  /** etiqueta del elemento contenedor */
  as?: "h1" | "h2" | "h3" | "p" | "span"
  /** retardo entre palabras en ms */
  stagger?: number
}

/**
 * SplitText — revela un titular palabra por palabra al entrar al viewport
 * (ref: floema.com, Loewe). Cada palabra sube desde abajo dentro de una
 * máscara overflow-hidden. Una sola vez, sin loops: elegancia contenida.
 */
export function SplitText({
  text,
  className = "",
  as: Tag = "h2",
  stagger = 60,
}: SplitTextProps) {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
  const [reduce, setReduce] = useState(false)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReduce(true)
      setVisible(true)
      return
    }
    const el = ref.current
    if (!el) return

    // Chequeo de posición rAF-throttled en lugar de IntersectionObserver:
    // cubre también saltos instantáneos (anclas, scroll restaurado) donde
    // IO no dispara callbacks. El listener se elimina tras revelar.
    let revealed = false
    let ticking = false

    const check = () => {
      ticking = false
      if (revealed) return
      const r = el.getBoundingClientRect()
      if (r.top < window.innerHeight * 0.85) {
        revealed = true
        setVisible(true)
        window.removeEventListener("scroll", onScroll)
        window.removeEventListener("resize", onScroll)
      }
    }

    const onScroll = () => {
      if (!ticking && !revealed) {
        ticking = true
        requestAnimationFrame(check)
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll, { passive: true })
    requestAnimationFrame(check)

    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [])

  const words = text.split(" ")

  return (
    <Tag ref={ref as React.RefObject<never>} className={className} aria-label={text}>
      {words.map((word, i) => (
        <span
          key={i}
          aria-hidden
          className="inline-block overflow-hidden align-bottom"
        >
          <span
            className="inline-block will-change-transform"
            style={
              reduce
                ? undefined
                : {
                    transform: visible ? "translateY(0)" : "translateY(110%)",
                    opacity: visible ? 1 : 0,
                    transition: `transform 0.7s cubic-bezier(0.22,1,0.36,1) ${i * stagger}ms, opacity 0.5s ease ${i * stagger}ms`,
                  }
            }
          >
            {word}
          </span>
          {i < words.length - 1 && <span>&nbsp;</span>}
        </span>
      ))}
    </Tag>
  )
}
