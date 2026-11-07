"use client"

import { useLayoutEffect } from "react"

/**
 * Cookie Consent — Cliché Aromas
 *
 * Cumple con:
 *  - Colombia: Ley 1581 de 2012 (Protección de Datos Personales) +
 *              Decreto 1377 de 2013
 *  - México: LFPDPPP · Brasil: LGPD · Argentina: Ley 25.326
 *
 * Diseño: barra compacta pegada al borde inferior (publica su altura en
 * --cookie-bar-h para que las barras fijas suban). Solo dos acciones
 * (Aceptar / Rechazar) + un enlace "Saber más" a /cookies, donde (y solo ahí)
 * el usuario puede personalizar cada categoría de forma granular. El
 * consentimiento se guarda en localStorage bajo "cliche_cookie_consent" y se
 * expone en window.__cookieConsent. Venta en Colombia (Ley 1581/Decreto 1377):
 * categorías activadas por defecto en el panel; el banner prioriza "Aceptar".
 *
 * Nota: este banner NO se muestra en el panel de administración (rutas /admin*)
 * ni en el checkout (/checkout): en móvil tapaba el botón "Pagar" de la barra
 * sticky y bloqueaba la compra. En el resto de la tienda su z-index se mantiene
 * POR DEBAJO de las barras fijas de compra (producto z-40, checkout z-50) para
 * que nunca cubra un CTA de pago.
 */

export type ConsentState = {
  necessary: true // siempre true, no se puede desactivar
  analytics: boolean
  marketing: boolean
  timestamp: string
}

const STORAGE_KEY = "cliche_cookie_consent"

function loadConsent(): ConsentState | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed?.analytics !== "boolean") return null
    return parsed as ConsentState
  } catch {
    return null
  }
}

/**
 * Replica la decisión de marketing en una cookie legible por el servidor.
 * localStorage NO viaja en las peticiones, así que /api/capi necesita esta
 * cookie para saber si puede reenviar eventos a Meta ("1" = sí, "0" = no).
 */
function syncConsentCookie(consent: ConsentState) {
  if (typeof document === "undefined") return
  const value = consent.marketing ? "1" : "0"
  document.cookie = `cliche_marketing_consent=${value}; path=/; max-age=31536000; SameSite=Lax`
}

/** Guarda el consentimiento y notifica a los componentes que escuchan. */
export function saveConsent(consent: ConsentState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(consent))
  syncConsentCookie(consent)
  ;(window as unknown as Record<string, unknown>).__cookieConsent = consent
  window.dispatchEvent(new CustomEvent("cliche-consent-change", { detail: consent }))
}

export function getConsent(): ConsentState | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as Record<string, unknown>
  if (w.__cookieConsent) return w.__cookieConsent as ConsentState
  return loadConsent()
}

/**
 * Sin aviso (pedido de la marca, 7-nov-2026: nada debe interrumpir la
 * compra). El sitio sigue en el modelo opt-out de siempre ("al navegar
 * aceptas"): todo activo salvo que la persona lo apague en /cookies (enlace
 * en el pie). Este componente solo replica una decisión ya guardada en la
 * cookie del servidor, para que /api/capi la siga respetando.
 */
export function CookieConsent() {
  useLayoutEffect(() => {
    const existing = loadConsent()
    if (existing) {
      ;(window as unknown as Record<string, unknown>).__cookieConsent = existing
      syncConsentCookie(existing)
    }
  }, [])
  return null
}
