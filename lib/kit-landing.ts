import type { Product } from "@/lib/supabase"
import { NOTES_MAP } from "@/lib/aroma-notes"
import { getCatalogProduct } from "@/lib/catalog-data"
import { FAMILIES, familyOf } from "@/lib/families"
import { SEGMENT_LABEL, segmentsForSlug } from "@/lib/segments"
import { PRODUCT_PLACEHOLDER } from "@/lib/placeholder"
import type { KitAroma } from "@/lib/kit-landing-content"

export type { KitAroma, KitReview } from "@/lib/kit-landing-content"

/**
 * Datos de la landing /arma-tu-kit. Todo sale de la BD (productos activos) y
 * de las fuentes compartidas del repo (notas, familias, segmentos, precios):
 * la página NO quema aromas, notas ni precios. Helpers de SERVIDOR (importan
 * el catálogo completo); el contenido que usa el cliente está en
 * lib/kit-landing-content.ts.
 */

const BEST_SELLER_RE = /m[aá]s vendido|top ventas/i

/** "Aroma Tierra — Calidez Profunda" → "Tierra". */
export function shortAromaName(name: string): string {
  const base = name.replace(/^aroma\s+/i, "").split(/\s+[—–]\s+/)[0].trim()
  return base || name
}

function notesFor(slug: string): string[] {
  const withPrefix = slug.startsWith("aroma-") ? slug : `aroma-${slug}`
  return NOTES_MAP[withPrefix] ?? getCatalogProduct(slug)?.notes ?? []
}

function idealFor(slug: string, segments: string[]): string | null {
  // "Marcas infantiles y femeninas · aroma cítrico" → "Marcas infantiles y femeninas"
  const fromCatalog = getCatalogProduct(slug)?.recommendedFor?.split("·")[0]?.trim()
  if (fromCatalog) return fromCatalog
  const labels = segments.map((s) => SEGMENT_LABEL[s]).filter(Boolean)
  return labels.length ? labels.slice(0, 2).join(" · ") : null
}

/** Producto de la BD (o del catálogo local de respaldo) → aroma del armador. */
export function toKitAroma(p: Product): KitAroma {
  const segments = segmentsForSlug(p.slug)
  const fam = familyOf(p)
  return {
    id: p.id,
    name: shortAromaName(p.name),
    fullName: p.name,
    slug: p.slug,
    image: p.image_url || PRODUCT_PLACEHOLDER,
    stock: typeof p.stock === "number" ? p.stock : 0,
    badge: p.badge || null,
    notes: notesFor(p.slug),
    family: fam ? FAMILIES.find((f) => f.value === fam)?.label ?? null : null,
    idealFor: idealFor(p.slug, segments),
    segments,
    bestSeller: !!p.badge && BEST_SELLER_RE.test(p.badge),
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

/** "Alejandra Martínez Ch." → "Alejandra M." (no publicar apellidos completos). */
export function reviewerDisplayName(raw: string): string {
  const parts = raw.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "Cliente"
  const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
  return parts[1] ? `${first} ${parts[1].charAt(0).toUpperCase()}.` : first
}
