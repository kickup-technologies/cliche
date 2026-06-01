"use client"

import { useEffect, useState } from "react"
import { X, Cookie, Shield, BarChart2, Megaphone, ChevronDown, ChevronUp } from "lucide-react"

/**
 * Cookie Consent — Cliché Aromas
 *
 * Cumple con:
 *  - Colombia: Ley 1581 de 2012 (Protección de Datos Personales) +
 *              Decreto 1377 de 2013
 *  - México: LFPDPPP
 *  - Brasil: LGPD (Lei Geral de Proteção de Dados)
 *  - Argentina: Ley 25.326
 *
 * Categorías:
 *  1. Estrictamente necesarias — siempre activas (carrito, sesión)
 *  2. Analíticas — rastreo de páginas (/api/track) para el dashboard admin
 *  3. Marketing — pixels de Meta, retargeting (si se activan en el futuro)
 *
 * El consentimiento se guarda en localStorage bajo la clave "cliche_cookie_consent"
 * y se expone en window.__cookieConsent para que otros componentes lo lean.
 */

export type ConsentState = {
  necessary: true      // siempre true, no se puede desactivar
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
    // Validar estructura mínima
    if (typeof parsed?.analytics !== "boolean") return null
    return parsed as ConsentState
  } catch {
    return null
  }
}

function saveConsent(consent: ConsentState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(consent))
  // Exponerlo globalmente para page-tracker y otros
  ;(window as unknown as Record<string, unknown>).__cookieConsent = consent
  // Disparar evento custom para que page-tracker reaccione sin re-render
  window.dispatchEvent(new CustomEvent("cliche-consent-change", { detail: consent }))
}

export function getConsent(): ConsentState | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as Record<string, unknown>
  if (w.__cookieConsent) return w.__cookieConsent as ConsentState
  return loadConsent()
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [analytics, setAnalytics] = useState(true)
  const [marketing, setMarketing] = useState(false)

  useEffect(() => {
    // Ya dio su respuesta en una visita anterior → no mostrar
    const existing = loadConsent()
    if (existing) {
      ;(window as unknown as Record<string, unknown>).__cookieConsent = existing
      return
    }
    // Pequeño delay para no bloquear el LCP
    const t = setTimeout(() => setVisible(true), 1200)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null

  const accept = (all: boolean) => {
    const consent: ConsentState = {
      necessary: true,
      analytics: all ? true : analytics,
      marketing: all ? true : marketing,
      timestamp: new Date().toISOString(),
    }
    saveConsent(consent)
    setVisible(false)
  }

  const reject = () => {
    const consent: ConsentState = {
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
    }
    saveConsent(consent)
    setVisible(false)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Preferencias de cookies"
      className="fixed bottom-0 left-0 right-0 z-[2147483647] p-3 sm:p-4"
      style={{ fontFamily: "system-ui, sans-serif" }}
    >
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl border border-[#e8ddd8] overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3 p-4 pb-3 border-b border-[#f0e8e4]">
          <Cookie className="w-5 h-5 text-[#A67163] flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[#2D1A14] text-sm">Usamos cookies 🍪</p>
            <p className="text-xs text-[#6b5a54] mt-0.5 leading-relaxed">
              Para mejorar tu experiencia de compra usamos cookies propias y de terceros.
              Puedes aceptarlas todas, personalizarlas o rechazar las no esenciales.
              Conforme a la <strong>Ley 1581 de 2012</strong> (Colombia) y normativas de protección de datos de América Latina.
            </p>
          </div>
          <button
            onClick={reject}
            className="flex-shrink-0 text-[#9e8a84] hover:text-[#2D1A14] transition-colors"
            aria-label="Cerrar y rechazar cookies no esenciales"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Personalizar (expandible) */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-[#A67163] font-semibold hover:bg-[#fdf8f6] transition-colors border-b border-[#f0e8e4]"
          aria-expanded={expanded}
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? "Ocultar opciones" : "Personalizar mis preferencias"}
        </button>

        {expanded && (
          <div className="px-4 py-3 space-y-3 border-b border-[#f0e8e4] bg-[#fdf8f6]">
            {/* Necesarias */}
            <CategoryRow
              icon={<Shield className="w-4 h-4 text-green-600" />}
              title="Estrictamente necesarias"
              desc="Carrito de compras, sesión de usuario. Sin estas la tienda no funciona."
              enabled
              locked
            />
            {/* Analíticas */}
            <CategoryRow
              icon={<BarChart2 className="w-4 h-4 text-blue-500" />}
              title="Analíticas"
              desc="Contamos páginas visitadas para mejorar la tienda. No se venden a terceros."
              enabled={analytics}
              onChange={setAnalytics}
            />
            {/* Marketing */}
            <CategoryRow
              icon={<Megaphone className="w-4 h-4 text-orange-500" />}
              title="Marketing"
              desc="Anuncios personalizados en Meta (Facebook/Instagram). Puedes desactivarlos."
              enabled={marketing}
              onChange={setMarketing}
            />
          </div>
        )}

        {/* Tus derechos */}
        <div className="px-4 py-2 border-b border-[#f0e8e4] bg-[#fdf8f6]">
          <p className="text-[10px] text-[#9e8a84] leading-relaxed">
            Tienes derecho a conocer, actualizar, rectificar y solicitar la supresión de tus datos personales
            (Arts. 8 y 16, Ley 1581/2012). Escríbenos a{" "}
            <a href="mailto:contacto@clichearomas.com" className="underline hover:text-[#A67163]">
              contacto@clichearomas.com
            </a>{" "}
            para ejercer tus derechos.
          </p>
        </div>

        {/* Botones */}
        <div className="flex gap-2 p-3">
          <button
            onClick={reject}
            className="flex-1 py-2 rounded-full text-xs font-semibold border border-[#d6c8c2] text-[#6b5a54] hover:border-[#A67163] hover:text-[#A67163] transition-colors"
          >
            Solo necesarias
          </button>
          {expanded && (
            <button
              onClick={() => accept(false)}
              className="flex-1 py-2 rounded-full text-xs font-semibold border border-[#A67163] text-[#A67163] hover:bg-[#A67163]/5 transition-colors"
            >
              Guardar selección
            </button>
          )}
          <button
            onClick={() => accept(true)}
            className="flex-1 py-2 rounded-full text-xs font-semibold bg-[#A67163] text-white hover:bg-[#8f5e51] transition-colors"
          >
            Aceptar todas
          </button>
        </div>
      </div>
    </div>
  )
}

function CategoryRow({
  icon, title, desc, enabled, locked, onChange,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  enabled: boolean
  locked?: boolean
  onChange?: (v: boolean) => void
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[#2D1A14]">{title}</p>
        <p className="text-[10px] text-[#9e8a84] leading-relaxed mt-0.5">{desc}</p>
      </div>
      {locked ? (
        <span className="text-[10px] text-green-600 font-semibold flex-shrink-0 mt-1">Siempre activas</span>
      ) : (
        <button
          role="switch"
          aria-checked={enabled}
          onClick={() => onChange?.(!enabled)}
          className={`flex-shrink-0 mt-1 w-10 h-5 rounded-full transition-colors relative ${
            enabled ? "bg-[#A67163]" : "bg-[#d6c8c2]"
          }`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              enabled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      )}
    </div>
  )
}
