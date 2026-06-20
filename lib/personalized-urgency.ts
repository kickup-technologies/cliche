"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Urgencia PERSONALIZADA por sesión (cortina de humo de conversión).
 *
 * No depende del inventario real (que es privado). En su lugar, detecta el
 * INTERÉS del visitante en un producto y activa la urgencia SOLO en ese
 * producto, para esa persona:
 *   - Entró por enlace directo a la ficha (referrer externo/sin referrer) → alta intención.
 *   - Volvió a ver el mismo producto (>= 2 vistas) → interés repetido.
 *
 * Así, cada visitante ve urgencia en el/los producto(s) que a ÉL le interesan;
 * otra persona con otro producto verá urgencia en ese otro. 100% personalizado.
 *
 * Es determinista y estable dentro de la sesión (el contador no parpadea ni se
 * reinicia): la activación se guarda en sessionStorage. El conteo de vistas vive
 * en localStorage para detectar visitas repetidas entre sesiones.
 */

export interface PersonalUrgency {
  active: boolean
  units: number          // "pocas unidades" (ficción, 3–8)
  offerEndsAt: number    // timestamp ms — fin de la oferta personalizada
  headline: string       // copy de oferta
  stockMessage: string   // copy de escasez
}

const VIEWS_KEY = "cliche_pviews"          // { [slug]: count }  (localStorage)
const URG_KEY = "cliche_urgency_session"   // { [slug]: PersonalUrgency } (sessionStorage)
const OFFER_MINUTES = 30                    // duración del countdown personalizado

// Pools variados (curados) para que se sienta natural y no repetitivo.
const HEADLINES = [
  "Oferta especial para ti",
  "Precio especial por tiempo limitado",
  "Tu aroma favorito, con beneficio",
]
const STOCK_MSGS = [
  "Muy solicitado — quedan pocas unidades",
  "Alta demanda esta semana",
  "Se está agotando rápido",
  "Últimas unidades de este lote",
]

function readJSON<T>(storage: Storage, key: string, fallback: T): T {
  try { const v = storage.getItem(key); return v ? (JSON.parse(v) as T) : fallback } catch { return fallback }
}
function writeJSON(storage: Storage, key: string, value: unknown) {
  try { storage.setItem(key, JSON.stringify(value)) } catch {}
}

// Hash estable del slug → elige variantes de forma determinista por producto.
function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

/** Llega por enlace directo (no navegó dentro del sitio). */
function isDirectEntry(): boolean {
  try {
    const ref = document.referrer
    if (!ref) return true
    return new URL(ref).host !== window.location.host
  } catch {
    return true
  }
}

/**
 * Registra una vista del producto y devuelve la urgencia personalizada (o
 * inactiva). Llamar UNA vez por carga de ficha (en useEffect).
 */
export function usePersonalizedUrgency(slug: string | undefined): PersonalUrgency | null {
  const [urgency, setUrgency] = useState<PersonalUrgency | null>(null)
  // Evita el doble conteo de React Strict Mode (dev) por carga del mismo producto.
  const countedSlug = useRef<string | null>(null)

  useEffect(() => {
    if (!slug) return
    if (countedSlug.current === slug) return
    countedSlug.current = slug

    // 1) Contar vistas (persistente) para detectar interés repetido.
    const views = readJSON<Record<string, number>>(localStorage, VIEWS_KEY, {})
    const prev = views[slug] || 0
    const count = prev + 1
    views[slug] = count
    writeJSON(localStorage, VIEWS_KEY, views)

    // 2) Señal de interés: enlace directo o 2ª+ vista del mismo producto.
    const highInterest = isDirectEntry() || count >= 2

    const session = readJSON<Record<string, PersonalUrgency>>(sessionStorage, URG_KEY, {})

    // Si ya se activó en esta sesión para este producto, reusar (estable).
    if (session[slug]?.active) {
      setUrgency(session[slug])
      return
    }

    if (!highInterest) {
      setUrgency(null)
      return
    }

    // 3) Activar urgencia personalizada (valores deterministas por slug).
    const h = hash(slug)
    const cfg: PersonalUrgency = {
      active: true,
      units: 3 + (h % 6),                 // 3–8
      offerEndsAt: Date.now() + OFFER_MINUTES * 60_000,
      headline: HEADLINES[h % HEADLINES.length],
      stockMessage: STOCK_MSGS[h % STOCK_MSGS.length],
    }
    session[slug] = cfg
    writeJSON(sessionStorage, URG_KEY, session)
    setUrgency(cfg)
  }, [slug])

  return urgency
}
