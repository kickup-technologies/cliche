"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { ShieldCheck } from "lucide-react"

/**
 * Cookie Consent — Cliché Aromas
 *
 * Cumple con:
 *  - Colombia: Ley 1581 de 2012 (Protección de Datos Personales) +
 *              Decreto 1377 de 2013
 *  - México: LFPDPPP · Brasil: LGPD · Argentina: Ley 25.326
 *
 * Diseño: banner minimalista, premium y poco invasivo. Solo dos acciones
 * (Aceptar / Rechazar) + un enlace "Saber más" a /cookies, donde (y solo ahí)
 * el usuario puede personalizar cada categoría de forma granular. El
 * consentimiento se guarda en localStorage bajo "cliche_cookie_consent" y se
 * expone en window.__cookieConsent. Venta en Colombia (Ley 1581/Decreto 1377):
 * categorías activadas por defecto en el panel; el banner prioriza "Aceptar".
 *
 * Nota: este banner NO se muestra en el panel de administración
 * (rutas /admin*), solo en la tienda de cara al cliente.
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

/** Guarda el consentimiento y notifica a los componentes que escuchan. */
export function saveConsent(consent: ConsentState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(consent))
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
  const [visible, setVisible] = useState(false)

  // No mostrar en el panel de administración — solo en la tienda
  const isAdminArea = pathname?.startsWith("/admin")

  useEffect(() => {
    if (isAdminArea) return
    const existing = loadConsent()
    if (existing) {
      ;(window as unknown as Record<string, unknown>).__cookieConsent = existing
      return
    }
    const t = setTimeout(() => setVisible(true), 1200)
    return () => clearTimeout(t)
  }, [isAdminArea])

  if (isAdminArea || !visible) return null

  const decide = (accepted: boolean) => {
    saveConsent({
      necessary: true,
      analytics: accepted,
      marketing: accepted,
      timestamp: new Date().toISOString(),
    })
    setVisible(false)
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Aviso de cookies"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[2147483647] w-[calc(100%-2rem)] max-w-md px-1"
      style={{ fontFamily: "system-ui, sans-serif" }}
    >
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_8px_40px_-8px_rgba(45,26,20,0.25)] border border-[#ece2dc] px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-full bg-[#f6ede9] flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-[#A67163]" strokeWidth={2.2} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[#2D1A14] leading-snug">
              Tu experiencia, a tu medida
            </p>
            <p className="text-[12px] text-[#7a6a63] mt-1 leading-relaxed">
              Usamos cookies para recordar tu carrito, mostrarte lo que amas y
              mejorar cada visita. Acéptalas para disfrutar la mejor versión de
              Cliché.{" "}
              <Link
                href="/cookies"
                className="text-[#A67163] underline underline-offset-2 hover:text-[#8f5e51] font-medium"
              >
                Saber más
              </Link>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => decide(false)}
            className="px-5 py-2.5 rounded-full text-[12px] font-medium text-[#9e8a84] hover:text-[#2D1A14] transition-colors"
          >
            Rechazar
          </button>
          <button
            onClick={() => decide(true)}
            className="flex-1 py-2.5 rounded-full text-[13px] font-semibold bg-[#A67163] text-white shadow-sm hover:bg-[#8f5e51] transition-colors"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  )
}
