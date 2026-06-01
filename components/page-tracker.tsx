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

    // ── Captura de CLICS para el mapa de calor propio ──────────────────────
    // Registra qué se hunde y dónde (coordenadas relativas) para pintar zonas
    // calientes en tiempo real sin depender de Clarity. Respeta consentimiento.
    const labelFor = (start: HTMLElement | null): string => {
      let el: HTMLElement | null = start
      for (let i = 0; el && i < 6; i++, el = el.parentElement) {
        const tag = el.tagName?.toLowerCase()
        const explicit = el.getAttribute?.("data-heat")
        if (explicit) return explicit.slice(0, 80)
        if (tag === "button" || tag === "a" || el.getAttribute?.("role") === "button") {
          const aria = el.getAttribute("aria-label")
          const txt = (aria || el.innerText || "").replace(/\s+/g, " ").trim()
          return (txt || (tag === "a" ? "enlace" : "botón")).slice(0, 80)
        }
      }
      return "(zona vacía)"
    }

    const onClick = (e: MouseEvent) => {
      const consent = getConsent()
      if (!consent || !consent.analytics) return
      const vw = window.innerWidth || 1
      const vh = window.innerHeight || 1
      fetch("/api/track/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: pathname,
          label: labelFor(e.target as HTMLElement),
          xr: e.clientX / vw,
          yr: e.clientY / vh,
          vw, vh,
        }),
        keepalive: true,
      }).catch(() => {})
    }
    window.addEventListener("click", onClick, true)

    // Escuchar si el usuario da consentimiento en esta misma visita
    const onConsent = () => track()
    window.addEventListener("cliche-consent-change", onConsent)
    return () => {
      window.removeEventListener("cliche-consent-change", onConsent)
      window.removeEventListener("click", onClick, true)
    }
  }, [pathname])

  return null
}
