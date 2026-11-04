/**
 * Landing B2B /empresas — fuente ÚNICA de las opciones del formulario de
 * cotización, su validación y la clasificación del ORIGEN del contacto.
 *
 * Sin dependencias de servidor: la importan el formulario (cliente), el
 * endpoint /api/empresas/lead (servidor, que vuelve a validar TODO sin
 * confiar en el cliente) y la sección "Empresas" del panel.
 */

// ── Contenido pendiente de confirmar con la clienta ──────────────────────────
// Lo que la maqueta de la agencia traía y NO está publicado ni comprobado en el
// sitio/BD queda apagado aquí. Para activarlo basta cambiar el flag.

/** Programa de distribuidores: opción del formulario, nota y pregunta
 *  frecuente de la maqueta de Cliché. Activo porque /empresas copia la maqueta
 *  tal cual y su formulario no pierde campos. No publica condiciones: la
 *  respuesta es "te contamos las condiciones" (las da el equipo comercial).
 *  Apagarlo quita la opción en el formulario, el servidor y la landing. */
export const OFRECER_DISTRIBUIDORES = true

// ── Opciones del formulario ──────────────────────────────────────────────────

export interface NeedOption {
  key: "coleccion" | "exclusivo" | "regalos" | "distribuidor"
  /** texto completo que se guarda y llega al equipo comercial */
  value: string
  /** etiqueta corta del botón */
  label: string
}

const ALL_NEEDS: NeedOption[] = [
  { key: "coleccion", value: "Un aroma de la colección para mi negocio", label: "Aroma de la colección" },
  { key: "exclusivo", value: "Un aroma exclusivo para mi marca", label: "Aroma exclusivo" },
  { key: "regalos", value: "Regalos corporativos", label: "Regalos corporativos" },
  { key: "distribuidor", value: "Quiero ser distribuidor", label: "Quiero ser distribuidor" },
]

export const NEED_OPTIONS: NeedOption[] = ALL_NEEDS.filter(
  (n) => n.key !== "distribuidor" || OFRECER_DISTRIBUIDORES,
)

export const BUSINESS_TYPES = [
  "Tienda o marca de ropa",
  "Marca infantil",
  "Marca deportiva o activewear",
  "Hotel, spa o Airbnb",
  "Oficina o consultorio",
  "Tienda de regalos o decoración",
  "Otro",
] as const

export const QUANTITY_OPTIONS = [
  "No sé todavía",
  "Menos de 10 frascos",
  "De 10 a 49",
  "De 50 a 199",
  "200 o más",
] as const

export const WHEN_OPTIONS = [
  "Sin fecha definida",
  "Este mes",
  "Antes de Navidad",
  "Enero o después",
] as const

// ── Límites y reglas (mismas en cliente y servidor) ──────────────────────────

export const LIMITS = {
  nombre: 80,
  empresa: 120,
  ciudad: 80,
  email: 160,
  mensaje: 1500,
} as const

/** Celular colombiano: 10 dígitos que empiezan por 3 (acepta +57 / 57 delante). */
export function normalizeCoMobile(raw: string): string | null {
  let d = String(raw || "").replace(/\D/g, "")
  if (d.length === 12 && d.startsWith("57")) d = d.slice(2)
  return /^3\d{9}$/.test(d) ? d : null
}

export function isValidEmail(raw: string): boolean {
  const v = String(raw || "").trim()
  return v.length <= LIMITS.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

// ── Origen del contacto ──────────────────────────────────────────────────────

/** Parámetros de la URL de aterrizaje que se conservan (primer toque). */
export const ORIGIN_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "gbraid",
  "wbraid",
  "fbclid",
] as const

export type OriginParam = (typeof ORIGIN_PARAMS)[number]

/** Lo que el navegador guarda al aterrizar y manda con el formulario. */
export type LeadOrigin = Partial<Record<OriginParam, string>> & {
  referrer?: string
  landing_page?: string
  /** ISO de la fecha/hora del aterrizaje */
  landed_at?: string
}

export type OriginChannel = "google" | "meta" | "otra_campana" | "referido" | "directo"

export const ORIGIN_LABEL: Record<OriginChannel, string> = {
  google: "Google Ads",
  meta: "Meta (Facebook/Instagram)",
  otra_campana: "Otra campaña (UTM)",
  referido: "Otro sitio / buscador",
  directo: "Directo",
}

/** Canal derivado del primer toque. Los ids de clic mandan sobre las UTM. */
export function classifyOrigin(o: LeadOrigin): OriginChannel {
  const src = (o.utm_source || "").toLowerCase()
  if (o.gclid || o.gbraid || o.wbraid) return "google"
  if (o.fbclid) return "meta"
  if (/^(google|adwords|gads|google_ads)$/.test(src)) return "google"
  if (/^(facebook|fb|instagram|ig|meta|an|messenger)$/.test(src)) return "meta"
  if (src || o.utm_medium || o.utm_campaign) return "otra_campana"
  if (o.referrer) {
    try {
      const host = new URL(o.referrer).hostname.replace(/^www\./, "")
      if (host && !host.endsWith("clichecolombia.com")) return "referido"
    } catch { /* referrer inválido → directo */ }
  }
  return "directo"
}

/** Clave de almacenamiento del primer toque en el navegador. */
export const ORIGIN_STORAGE_KEY = "cliche_b2b_origen"
/** El primer toque vence a los 90 días (misma vida que la cookie _fbc). */
export const ORIGIN_TTL_MS = 90 * 24 * 60 * 60 * 1000
