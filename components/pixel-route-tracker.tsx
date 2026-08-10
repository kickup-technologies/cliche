"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { getConsent } from "@/components/cookie-consent"

/**
 * PixelRouteTracker — avisa a los píxeles en cada cambio de ruta de la SPA
 * (App Router no recarga la página, así que sin esto Meta y Google Analytics
 * solo ven la PRIMERA página que abre el visitante y quedan ciegos al resto
 * de la navegación: catálogo → ficha → checkout).
 *
 * - Salta el primer render: ese PageView ya lo emiten loadMetaPixel()/loadGA4().
 * - No trackea el panel /admin (mismo criterio que PixelManager).
 * - Respeta el consentimiento POR CATEGORÍA, igual que PixelManager:
 *   fbq es marketing; gtag (GA4) es analytics.
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

    if (!(consent && !consent.marketing) && typeof window.fbq === "function") {
      window.fbq("track", "PageView")
    }

    // GA4: page_view por evento (repetir gtag('config') duplicaría métricas).
    // OJO: gtag.js de GA4 NO entiende `page_path` (eso era de Universal
    // Analytics); sin `page_location` el evento hereda la URL de aterrizaje y
    // todas las vistas contarían para la primera página.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gtag = (window as any).gtag
    if (!(consent && !consent.analytics) && typeof gtag === "function") {
      gtag("event", "page_view", {
        page_location: window.location.href,
        page_title: document.title,
      })
    }
  }, [pathname])

  return null
}
