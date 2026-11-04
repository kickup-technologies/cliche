import type { Product } from "@/lib/supabase"
import { NOTES_MAP } from "@/lib/aroma-notes"
import { getCatalogProduct } from "@/lib/catalog-data"
import { FAMILIES, familyOf } from "@/lib/families"
import { SEGMENT_LABEL, segmentsForSlug } from "@/lib/segments"
import { PRODUCT_PLACEHOLDER } from "@/lib/placeholder"
import type { KitAroma } from "@/lib/kit-landing-content"

export type { KitAroma } from "@/lib/kit-landing-content"

/**
 * Datos de la landing /arma-tu-kit. Todo sale de la BD (productos activos) y
 * de las fuentes compartidas del repo (notas, familias, segmentos, precios):
 * la página NO quema aromas, notas ni precios. Helpers de SERVIDOR (importan
 * el catálogo completo); el contenido que usa el cliente está en
 * lib/kit-landing-content.ts.
 */

const BEST_SELLER_RE = /m[aá]s vendido|top ventas/i

/** Quita el prefijo "aroma-" (BD) para cruzar con el catálogo local y la maqueta. */
const baseSlug = (slug: string) => slug.replace(/^aroma-/, "")

/** "Aroma Tierra — Calidez Profunda" → "Tierra". */
export function shortAromaName(name: string): string {
  const base = name.replace(/^aroma\s+/i, "").split(/\s+[—–]\s+/)[0].trim()
  return base || name
}

function notesFor(slug: string): string[] {
  const withPrefix = slug.startsWith("aroma-") ? slug : `aroma-${slug}`
  return NOTES_MAP[withPrefix] ?? getCatalogProduct(slug)?.notes ?? []
}

/**
 * Usos del filtro de la maqueta por aroma (curaduría de la maqueta, no un
 * dato de producto). Un aroma nuevo que no esté aquí hereda sus usos de los
 * segmentos del sitio (SEGMENT_TO_USO), así nunca queda fuera del filtro.
 */
const USOS_MAQUETA: Record<string, string[]> = {
  "agua": ["hotel", "hogar"],
  "air-fresh": ["mascotas"],
  "aire": ["hotel", "hogar"],
  "best-friends": ["mascotas"],
  "brillos-seda": ["boutique", "hogar"],
  "brillos-de-seda": ["boutique", "hogar"],
  "calor-de-lana": ["boutique", "infantil"],
  "coconut": ["playa", "infantil"],
  "dulce-lana": ["infantil", "boutique"],
  "eternamente-indigo": ["deportiva"],
  "frescura-de-lino": ["boutique", "accesorios"],
  "happiness": ["hogar"],
  "hilos-de-seda": ["accesorios", "boutique"],
  "indigo-profundo": ["deportiva"],
  "luxury": ["deportiva", "boutique"],
  "lycra-de-verano": ["boutique", "deportiva"],
  "mahai": ["playa", "accesorios"],
  "navidad": ["hogar"],
  "romeo-y-julieta": ["accesorios"],
  "seda-del-lejano-oriente": ["boutique", "accesorios"],
  "sello-de-dios": ["hotel", "hogar"],
  "sugar-pop": ["infantil", "hogar"],
  "tao": ["boutique", "infantil", "playa"],
  "tierra": ["hotel", "boutique"],
  "vientos-de-lino": ["boutique", "accesorios"],
  "watermelon": ["infantil"],
}

const SEGMENT_TO_USO: Record<string, string> = {
  femeninas: "boutique",
  masculinas: "deportiva",
  unisex: "deportiva",
  deportivas: "deportiva",
  luxury: "deportiva",
  infantiles: "infantil",
  bano: "playa",
  mascotas: "mascotas",
  hoteles: "hotel",
  spa: "hotel",
  accesorios: "accesorios",
  hogar: "hogar",
}

function usesFor(slug: string, segments: string[]): string[] {
  const fromMockup = USOS_MAQUETA[baseSlug(slug)]
  if (fromMockup) return fromMockup
  return [...new Set(segments.map((s) => SEGMENT_TO_USO[s]).filter(Boolean))]
}

/**
 * Línea "Ideal para · familia" de la tarjeta. La maqueta la toma del texto de
 * recomendación del catálogo ("Marcas infantiles y femeninas · aroma
 * cítrico"); los tres aromas que solo existen en la BD usan la línea de la
 * maqueta, y cualquier otro se arma con sus segmentos y su familia.
 */
const IDEAL_MAQUETA: Record<string, string> = {
  "happiness": "Baños, cocinas y espacios de la mañana · cítrico floral",
  "navidad": "Reuniones, fiestas y tiendas en diciembre · especiado",
  "sugar-pop": "Cuartos, clósets y ropa · dulce frutal",
}

function idealLineFor(p: Product, segments: string[]): string | null {
  const fromCatalog = getCatalogProduct(p.slug)?.recommendedFor?.trim()
  if (fromCatalog) return fromCatalog
  const fromMockup = IDEAL_MAQUETA[baseSlug(p.slug)]
  if (fromMockup) return fromMockup
  const labels = segments.map((s) => SEGMENT_LABEL[s]).filter(Boolean).slice(0, 2)
  const fam = familyOf(p)
  const famLabel = fam ? FAMILIES.find((f) => f.value === fam)?.label?.toLowerCase() : null
  const parts = [labels.join(" · "), famLabel].filter(Boolean)
  return parts.length ? parts.join(" · ") : null
}

/** Producto de la BD (o del catálogo local de respaldo) → aroma del armador. */
export function toKitAroma(p: Product): KitAroma {
  const segments = segmentsForSlug(p.slug)
  return {
    id: p.id,
    name: shortAromaName(p.name),
    fullName: p.name,
    slug: p.slug,
    image: p.image_url || PRODUCT_PLACEHOLDER,
    stock: typeof p.stock === "number" ? p.stock : 0,
    badge: p.badge || null,
    notes: notesFor(p.slug),
    idealLine: idealLineFor(p, segments),
    uses: usesFor(p.slug, segments),
    bestSeller: !!p.badge && BEST_SELLER_RE.test(p.badge),
    // Se completan en la página con las reseñas reales (ver loadRatings).
    rating: null,
    ratingCount: 0,
  }
}

/** Aromas que se pueden meter en un kit: activos, con stock, sin kits ni el producto de prueba. */
export function isKitEligible(p: Product): boolean {
  return (
    p.is_active !== false &&
    !p.slug?.startsWith("kit-") &&
    p.slug !== "prueba" &&
    (p.stock ?? 0) > 0
  )
}
