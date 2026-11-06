"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"

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

export function CookieConsent() {
  const pathname = usePathname()
  // ARRANCA VISIBLE: el banner viaja en el HTML del servidor y pinta con el
  // primer paint. Antes arrancaba oculto y aparecía tras la hidratación — esa
  // pintura tardía era el elemento LCP de la página en PSI móvil (17s→6s,
  // medido 2026-08-26). Para quien ya decidió, el <script> inline de abajo lo
  // oculta ANTES del primer paint y useLayoutEffect lo desmonta sin flash.
  const [visible, setVisible] = useState(true)
  const barRef = useRef<HTMLDivElement>(null)

  // No mostrar en el panel de administración ni en el checkout: en el checkout
  // móvil el banner quedaba encima del botón "Pagar" (barra sticky inferior) y
  // bloqueaba el pago hasta que el usuario decidiera sobre las cookies.
  const isHiddenRoute = pathname?.startsWith("/admin") || pathname?.startsWith("/checkout")

  // useLayoutEffect corre ANTES de que el navegador pinte el render hidratado:
  // si ya hay consentimiento guardado, el banner se desmonta sin llegar a verse.
  useLayoutEffect(() => {
    const existing = loadConsent()
    if (existing) {
      ;(window as unknown as Record<string, unknown>).__cookieConsent = existing
      // Usuarios que decidieron antes de existir la cookie server-side:
      // sincronizamos su elección para que /api/capi también la respete.
      syncConsentCookie(existing)
      setVisible(false)
    }
  }, [])

  // Altura de la barra publicada como --cookie-bar-h en <html> mientras se ve:
  // las barras fijas de compra (bandeja del kit, barra de /empresas, barra
  // de la ficha) y los botones flotantes suben esa altura, así la barra de
  // cookies nunca tapa un botón ni queda tapada. Sin barra, la variable no
  // existe y todos vuelven a su sitio (fallback 0px).
  const shown = visible && !isHiddenRoute
  useLayoutEffect(() => {
    const root = document.documentElement
    const el = barRef.current
    if (!shown || !el) {
      root.style.removeProperty("--cookie-bar-h")
      return
    }
    const publish = () => root.style.setProperty("--cookie-bar-h", `${el.offsetHeight}px`)
    publish()
    const ro = new ResizeObserver(publish)
    ro.observe(el)
    return () => {
      ro.disconnect()
      root.style.removeProperty("--cookie-bar-h")
    }
  }, [shown])

  if (!shown) return null

  const decide = (accepted: boolean) => {
    saveConsent({
      necessary: true,
      analytics: accepted,
      marketing: accepted,
      timestamp: new Date().toISOString(),
    })
    setVisible(false)
    // Al RECHAZAR recargamos para garantizar que ninguna analítica/pixel que ya
    // se hubiera cargado (modelo opt-out) siga ejecutándose en esta sesión.
    if (!accepted) window.location.reload()
  }

  return (
    // Barra compacta pegada al borde inferior (antes: tarjeta flotante a
    // 96px del borde que en el celular quedaba a media pantalla y tapaba el
    // botón principal de las landings). Respeta el área segura del teléfono.
    // z-30: por debajo de las barras de compra (z-40/z-50) y de los paneles;
    // como esas barras suben con --cookie-bar-h, no se superponen.
    <div
      id="cliche-cookie-banner"
      ref={barRef}
      role="dialog"
      aria-modal="false"
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[#ece2dc] bg-white/95 shadow-[0_-8px_24px_-14px_rgba(45,26,20,0.3)] backdrop-blur-md"
      style={{ fontFamily: "system-ui, sans-serif", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      // El script inline de abajo puede tocar style.display antes de hidratar;
      // no es un mismatch real, así que silenciamos la advertencia.
      suppressHydrationWarning
    >
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2 sm:gap-5 sm:py-2.5">
        <p className="min-w-0 flex-1 text-[11px] leading-snug text-[#7a6a63] sm:text-[12.5px]">
          Usamos cookies para tu carrito y para mejorar tu visita; al seguir navegando las aceptas.{" "}
          <Link
            href="/cookies"
            className="font-medium text-[#A67163] underline underline-offset-2 hover:text-[#8f5e51]"
          >
            Saber más
          </Link>
        </p>
        <div className="flex flex-none items-center gap-0.5 sm:gap-1">
          <button
            onClick={() => decide(false)}
            className="rounded-full px-2 py-2 text-[11.5px] font-medium text-[#9e8a84] transition-colors hover:text-[#2D1A14] sm:px-3 sm:text-[12px]"
          >
            Rechazar
          </button>
          <button
            onClick={() => decide(true)}
            className="rounded-full bg-[#A67163] px-3.5 py-2 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-[#8f5e51] sm:px-5 sm:text-[12.5px]"
          >
            Aceptar
          </button>
        </div>
      </div>

      {/* Anti-flash pre-hidratación: el banner viaja visible en el HTML del
          servidor; este script corre apenas el parser lo alcanza (antes del
          primer paint del banner) y lo oculta si el visitante ya decidió.
          Tras hidratar, useLayoutEffect toma el control y lo desmonta. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `try{if(localStorage.getItem("${STORAGE_KEY}"))document.getElementById("cliche-cookie-banner").style.display="none"}catch(e){}`,
        }}
      />
    </div>
  )
}
