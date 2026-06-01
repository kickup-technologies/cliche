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

    // ── Captura de SCROLL-DEPTH ────────────────────────────────────────────
    // Mide hasta dónde baja el visitante (0..1) y lo manda UNA vez al salir,
    // como evento sintético (label "__scroll", yr = profundidad). Reutiliza la
    // tabla click_events para no requerir migración. Respeta consentimiento.
    let maxDepth = 0
    let depthSent = false
    const onScroll = () => {
      const doc = document.documentElement
      const scrollable = doc.scrollHeight - window.innerHeight
      const depth = scrollable > 0 ? (window.scrollY || doc.scrollTop) / scrollable : 1
      if (depth > maxDepth) maxDepth = Math.min(1, depth)
    }
    const sendDepth = () => {
      if (depthSent) return
      const consent = getConsent()
      if (!consent || !consent.analytics) return
      depthSent = true
      const vw = window.innerWidth || 1
      const vh = window.innerHeight || 1
      try {
        const body = JSON.stringify({ path: pathname, label: "__scroll", xr: 0, yr: maxDepth, vw, vh })
        // sendBeacon sobrevive al cierre de la pestaña mejor que fetch
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/track/click", new Blob([body], { type: "application/json" }))
        } else {
          fetch("/api/track/click", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {})
        }
      } catch { /* noop */ }
    }
    const onVisibility = () => { if (document.visibilityState === "hidden") sendDepth() }
    window.addEventListener("scroll", onScroll, { passive: true })
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("pagehide", sendDepth)

    // Escuchar si el usuario da consentimiento en esta misma visita
    const onConsent = () => track()
    window.addEventListener("cliche-consent-change", onConsent)
    return () => {
      sendDepth()
      window.removeEventListener("cliche-consent-change", onConsent)
      window.removeEventListener("click", onClick, true)
      window.removeEventListener("scroll", onScroll)
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("pagehide", sendDepth)
    }
  }, [pathname])

  return null
}
