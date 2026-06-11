"use client"

import { useEffect, useState, ReactNode } from "react"

/**
 * Template — transición de entrada entre rutas (ref: floema.com, Byredo).
 * Next.js remonta template.tsx en cada navegación, así que el fade sutil
 * corre en cada cambio de página. Solo opacity: un transform aquí crearía
 * un containing block y rompería los position:fixed hijos (drawer, intro,
 * sticky bar). Sin librerías; CSS puro.
 */
export default function Template({ children }: { children: ReactNode }) {
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) {
      setEntered(true)
      return
    }
    const raf = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      style={{
        opacity: entered ? 1 : 0,
        transition: "opacity 0.5s ease",
      }}
    >
      {children}
    </div>
  )
}
