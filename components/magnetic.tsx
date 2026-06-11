"use client"

import { useRef, ReactNode } from "react"

interface MagneticProps {
  children: ReactNode
  /** intensidad del desplazamiento (px máximos aprox.) */
  strength?: number
  className?: string
}

/**
 * Magnetic — el contenido se inclina sutilmente hacia el cursor
 * (ref: Jacquemus, Loewe). Desplazamiento contenido (~10px) con
 * retorno elástico al salir. Solo desktop; en touch no hace nada.
 */
export function Magnetic({ children, strength = 10, className = "" }: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null)

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2
    el.style.transition = "transform 0.2s ease-out"
    el.style.transform = `translate(${x * strength}px, ${y * strength}px)`
  }

  const onLeave = () => {
    const el = ref.current
    if (!el) return
    el.style.transition = "transform 0.45s cubic-bezier(0.22,1,0.36,1)"
    el.style.transform = "translate(0, 0)"
  }

  return (
    <div
      ref={ref}
      className={`inline-block ${className}`}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </div>
  )
}
