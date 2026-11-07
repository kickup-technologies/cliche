"use client"

import { useEffect, useState } from "react"

/**
 * Encabezado que se esconde al bajar y vuelve al subir (como el de las
 * tiendas de referencia): `true` mientras la persona baja por la página,
 * pasado `umbral` px; `false` en cuanto sube un poco o vuelve arriba.
 */
export function useOcultarAlBajar(umbral = 140): boolean {
  const [oculto, setOculto] = useState(false)
  useEffect(() => {
    let ultimo = window.scrollY
    let raf = 0
    const alDeslizar = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const y = window.scrollY
        const d = y - ultimo
        if (y < umbral) setOculto(false)
        else if (d > 6) setOculto(true)
        else if (d < -6) setOculto(false)
        ultimo = y
      })
    }
    window.addEventListener("scroll", alDeslizar, { passive: true })
    return () => { window.removeEventListener("scroll", alDeslizar); cancelAnimationFrame(raf) }
  }, [umbral])
  return oculto
}
