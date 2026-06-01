"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { getConsent } from "@/components/cookie-consent"

/**
 * Registra vistas de página en /api/track SOLO si el usuario aceptó cookies
 * analíticas (conforme a Ley 1581/2012, Colombia).
 *
 * - Si aún no dio consentimiento: no trackea (espera el evento)
 * - Si aceptó analíticas: trackea
 * - Si rechazó: silencio total
 */
export function PageTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname?.startsWith("/admin")) return

    const track = () => {
      const consent = getConsent()
      // Sin consentimiento explícito o con analíticas rechazadas → no trackear
      if (!consent || !consent.analytics) return
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathname }),
      }).catch(() => {})
    }

    // Trackear si ya hay consentimiento previo
    track()

    // Escuchar si el usuario da consentimiento en esta misma visita
    const onConsent = () => track()
    window.addEventListener("cliche-consent-change", onConsent)
    return () => window.removeEventListener("cliche-consent-change", onConsent)
  }, [pathname])

  return null
}
