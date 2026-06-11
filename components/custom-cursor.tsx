"use client"

import { useEffect, useRef } from "react"

/**
 * Cursor personalizado tipo "luxury dot".
 * Dot pequeño terracota que sigue el mouse; se agranda al hacer hover
 * sobre links, botones e imágenes. Solo en desktop (hidden en touch).
 */
export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    // Ocultar cursor nativo
    document.documentElement.style.cursor = "none"

    let raf = 0
    let rx = -100, ry = -100   // ring (sigue con lag)
    let tx = -100, ty = -100   // target actual

    const onMove = (e: MouseEvent) => {
      tx = e.clientX
      ty = e.clientY
      dot.style.transform = `translate(${tx}px, ${ty}px)`
    }

    const lerp = (a: number, b: number, n: number) => a + (b - a) * n

    const animate = () => {
      rx = lerp(rx, tx, 0.12)
      ry = lerp(ry, ty, 0.12)
      ring.style.transform = `translate(${rx}px, ${ry}px)`
      raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)

    const onEnter = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (t.closest("a, button, [role='button'], img")) {
        dot.classList.add("cursor-grow")
        ring.classList.add("ring-grow")
      }
    }
    const onLeave = () => {
      dot.classList.remove("cursor-grow")
      ring.classList.remove("ring-grow")
    }

    window.addEventListener("mousemove", onMove)
    document.addEventListener("mouseover", onEnter)
    document.addEventListener("mouseout", onLeave)

    return () => {
      document.documentElement.style.cursor = ""
      cancelAnimationFrame(raf)
      window.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseover", onEnter)
      document.removeEventListener("mouseout", onLeave)
    }
  }, [])

  return (
    <>
      {/* Dot central */}
      <div
        ref={dotRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[99999] hidden -translate-x-1/2 -translate-y-1/2 will-change-transform md:block"
      >
        <div className="cursor-dot h-2 w-2 rounded-full bg-[#A67163] transition-transform duration-150" />
      </div>

      {/* Ring con lag */}
      <div
        ref={ringRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[99998] hidden -translate-x-1/2 -translate-y-1/2 will-change-transform md:block"
      >
        <div className="cursor-ring h-8 w-8 rounded-full border border-[#A67163]/50 transition-all duration-300" />
      </div>

      <style jsx global>{`
        .cursor-dot.cursor-grow {
          transform: scale(2.5);
          background-color: #A67163;
        }
        .cursor-ring.ring-grow {
          width: 3.5rem;
          height: 3.5rem;
          border-color: #A67163;
          opacity: 0.6;
        }
      `}</style>
    </>
  )
}
