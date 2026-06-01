/**
 * lib/urgency.ts — Configuración de Urgencia Inteligente (compartida)
 *
 * Una sola fuente de verdad para el panel admin (sección "Urgencia") y la
 * página de venta (product-detail). Se guarda como JSON en site_settings bajo
 * la clave pública `urgency_config` y se refleja SÍ O SÍ en la tienda.
 *
 * Métodos incluidos (elegidos por impacto real en conversión):
 *  1. low_stock  — Escasez. "¡Solo quedan X!" Disparador de aversión a la
 *     pérdida (Kahneman & Tversky): perder duele ~2x más que ganar.
 *  2. countdown  — Urgencia temporal. Cuenta regresiva de oferta. Reduce la
 *     postergación de la decisión de compra (efecto de fecha límite).
 *  3. social_proof — Prueba social en vivo. "X personas viendo esto ahora"
 *     (Cialdini): la gente sigue lo que otros hacen, sobre todo bajo
 *     incertidumbre.
 *
 * Placeholders en los mensajes:
 *   {stock} → unidades restantes reales del producto
 *   {n}     → número de personas viendo (fluctúa en vivo)
 */

export interface UrgencyConfig {
  low_stock: {
    enabled: boolean
    /** Mostrar el aviso solo cuando el stock real sea <= a este número */
    threshold: number
    /** Soporta el placeholder {stock} */
    message: string
  }
  countdown: {
    enabled: boolean
    /** Duración de la cuenta regresiva en horas (p. ej. 24, 6, 2) */
    hours: number
    /** Texto principal de la oferta */
    headline: string
    /** Texto que antecede al reloj */
    message: string
  }
  social_proof: {
    enabled: boolean
    /** Rango de "personas viendo" que fluctúa en vivo */
    min: number
    max: number
    /** Soporta el placeholder {n} */
    message: string
  }
}

/**
 * Defaults configurados bajo principios de psicología del consumidor.
 * Si el dueño de la tienda no sabe qué poner, esto ya convierte.
 */
export const URGENCY_DEFAULTS: UrgencyConfig = {
  low_stock: {
    enabled: true,
    // 8: lo bastante alto para activarse seguido, lo bastante bajo para ser creíble.
    threshold: 8,
    message: "¡Solo quedan {stock} unidades!",
  },
  countdown: {
    enabled: true,
    // 24h: ventana clásica que crea urgencia sin parecer falsa.
    hours: 24,
    headline: "Precio especial por tiempo limitado",
    message: "La oferta termina en",
  },
  social_proof: {
    enabled: true,
    min: 7,
    max: 22,
    message: "{n} personas están viendo esto ahora",
  },
}

/** Convierte el valor guardado (string JSON u objeto) en un UrgencyConfig válido. */
export function parseUrgencyConfig(raw: unknown): UrgencyConfig {
  if (!raw) return URGENCY_DEFAULTS
  let obj: unknown = raw
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw)
    } catch {
      return URGENCY_DEFAULTS
    }
  }
  if (!obj || typeof obj !== "object") return URGENCY_DEFAULTS
  const o = obj as Record<string, Record<string, unknown>>
  return {
    low_stock: { ...URGENCY_DEFAULTS.low_stock, ...(o.low_stock || {}) },
    countdown: { ...URGENCY_DEFAULTS.countdown, ...(o.countdown || {}) },
    social_proof: { ...URGENCY_DEFAULTS.social_proof, ...(o.social_proof || {}) },
  }
}

/** Reemplaza {stock} y {n} en un mensaje. */
export function fillUrgency(message: string, vars: { stock?: number; n?: number }): string {
  return message
    .replace(/\{stock\}/gi, String(vars.stock ?? ""))
    .replace(/\{n\}/gi, String(vars.n ?? ""))
}
