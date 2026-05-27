"use client"

import { useEffect } from "react"

/**
 * Fuerza scroll al top cuando el usuario recarga la página.
 * Sin esto, los navegadores modernos restauran la posición anterior.
 */
export function ScrollRestoration() {
  useEffect(() => {
    if (typeof window === "undefined") return
    // Desactivar la restauración automática del navegador
    window.history.scrollRestoration = "manual"
    // Ir al top inmediatamente
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior })
  }, [])

  return null
}
