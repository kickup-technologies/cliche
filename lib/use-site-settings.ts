"use client"

import { useEffect, useState } from "react"

export interface SiteSettings {
  discount_percentage: number
  discount_code: string
  announcement_text: string
  free_shipping_threshold: number
  whatsapp_number: string
  whatsapp_message: string
  hero_title: string
  hero_subtitle: string
  hero_slides: string[]
  urgency_bar_enabled: boolean
  countdown_enabled: boolean
  stock_badge_enabled: boolean
  social_proof_enabled: boolean
  featured_title: string
  featured_subtitle: string
}

/**
 * Hook compartido de configuración pública de la tienda.
 *
 * 1. Carga /api/settings al montar.
 * 2. Escucha mensajes `postMessage` del Editor Visual del admin
 *    (type: "cliche-preview-settings") para reflejar cambios EN VIVO
 *    dentro del iframe de previsualización, sin guardar todavía.
 *
 * Devuelve un objeto parcial: los componentes aplican sus propios defaults.
 */
export function useSiteSettings(): Partial<SiteSettings> {
  const [settings, setSettings] = useState<Partial<SiteSettings>>({})

  useEffect(() => {
    let alive = true
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => { if (alive) setSettings(d) })
      .catch(() => {})

    function onMessage(e: MessageEvent) {
      if (e.data && e.data.type === "cliche-preview-settings" && e.data.settings) {
        setSettings((prev) => ({ ...prev, ...e.data.settings }))
      }
    }
    window.addEventListener("message", onMessage)
    return () => { alive = false; window.removeEventListener("message", onMessage) }
  }, [])

  return settings
}
