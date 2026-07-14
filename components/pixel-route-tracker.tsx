"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { getConsent } from "@/components/cookie-consent"

/**
 * PixelRouteTracker — dispara fbq('track', 'PageView') en cada cambio de ruta
 * de la SPA (App Router no recarga la página, así que sin esto Meta solo ve
 * el PageView inicial que dispara PixelManager al cargar el pixel).
 *
 * - Salta el primer render: ese PageView ya lo emite loadMetaPixel().
 * - No trackea el panel /admin (mismo criterio que PixelManager).
 * - Respeta el consentimiento: si el usuario rechazó marketing, no envía nada
 *   (además, en ese caso fbq ni siquiera estaría cargado).
 */
export function PixelRouteTracker() {
  const pathname = usePathname()
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (!pathname || pathname.startsWith("/admin")) return

    const consent = getConsent()
    if (consent && !consent.marketing) return

    if (typeof window.fbq === "function") {
      window.fbq("track", "PageView")
    }
  }, [pathname])

  return null
}
