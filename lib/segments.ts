import type { Product } from "@/lib/supabase"

/**
 * Taxonomía B2B de Cliché — "¿A qué huele tu marca?".
 * Cada aroma se recomienda para uno o varios SEGMENTOS de marca/negocio.
 * Fuente: documento de distribuidores (mercado objetivo por aroma).
 *
 * Esto es la capa de datos que alimenta:
 *  - el landing segmentado (banner + hileras por categoría)
 *  - el menú de categorías / quick-access del header
 *  - filtros del catálogo
 */
export interface Segment {
  key: string
  /** etiqueta para el menú (dirigida a marcas) */
  label: string
  /** gancho B2B corto para el banner de la sección */
  tagline: string
}

/** Orden = prioridad de aparición en el landing. */
export const SEGMENTS: Segment[] = [
  { key: "femeninas",  label: "Marcas femeninas",   tagline: "Aromas que visten tu marca de delicadeza y elegancia." },
  { key: "masculinas", label: "Marcas masculinas",  tagline: "Carácter amaderado que proyecta seguridad y presencia." },
  { key: "unisex",     label: "Marcas unisex",      tagline: "Frescura versátil que le habla a todos tus clientes." },
  { key: "infantiles", label: "Marcas infantiles",  tagline: "Dulzura suave y feliz, pensada para los más pequeños." },
  { key: "deportivas", label: "Marcas deportivas",  tagline: "Energía fresca y vital para marcas en movimiento." },
  { key: "accesorios", label: "Accesorios, bolsos y calzado", tagline: "El detalle olfativo que vuelve memorable cada pieza." },
  { key: "bano",       label: "Vestidos de baño y playa", tagline: "Aromas tropicales que evocan verano eterno." },
  { key: "hoteles",    label: "Hoteles y hospedaje", tagline: "La primera impresión que hace que quieran quedarse." },
  { key: "spa",        label: "Spa y bienestar",    tagline: "Calma que transforma tu espacio en un refugio." },
  { key: "hogar",      label: "Hogar, oficina y consultorios", tagline: "Ambientes cuidados que transmiten confianza." },
  { key: "mascotas",   label: "Mascotas",           tagline: "Frescura limpia y segura para ellos y sus espacios." },
  { key: "luxury",     label: "Luxury y streetwear", tagline: "La estela premium que se huele antes de verse." },
]

export const SEGMENT_LABEL: Record<string, string> = Object.fromEntries(
  SEGMENTS.map((s) => [s.key, s.label]),
)

/**
 * slug normalizado del aroma → segmentos de marca recomendados (del documento).
 * Las claves NO llevan prefijo "aroma-": normalizamos antes de buscar, porque
 * en la BD los slugs vienen como "aroma-dulce-lana" y en el catálogo local como
 * "dulce-lana".
 */
export const PRODUCT_SEGMENTS: Record<string, string[]> = {
  "dulce-lana":             ["infantiles", "femeninas"],
  "vientos-de-lino":        ["femeninas", "accesorios"],
  "eternamente-indigo":     ["unisex", "deportivas", "masculinas"],
  "sello-de-dios":          ["infantiles", "spa", "hogar"],
  "brillos-de-seda":        ["femeninas", "deportivas", "accesorios", "infantiles"],
  "brillos-seda":           ["femeninas", "deportivas", "accesorios", "infantiles"],
  "calor-de-lana":          ["femeninas", "infantiles"],
  "indigo-profundo":        ["masculinas", "unisex"],
  "tierra":                 ["femeninas", "deportivas", "accesorios", "hoteles"],
  "agua":                   ["unisex", "deportivas", "masculinas", "hoteles", "spa", "hogar"],
  "aire":                   ["hoteles", "spa", "hogar"],
  "best-friends":           ["mascotas"],
  "lycra-de-verano":        ["femeninas", "deportivas"],
  "mahai":                  ["femeninas", "bano", "accesorios"],
  "tao":                    ["femeninas", "infantiles", "bano", "accesorios"],
  "romeo-y-julieta":        ["femeninas", "accesorios"],
  "frescura-de-lino":       ["femeninas", "accesorios"],
  "seda-del-lejano-oriente":["femeninas", "accesorios"],
  "luxury":                 ["femeninas", "unisex", "masculinas", "luxury"],
  "hilos-de-seda":          ["femeninas", "accesorios"],
  "coconut":                ["bano", "infantiles"],
  "watermelon":             ["infantiles"],
  "air-fresh":              ["mascotas"],
  // aromas que solo existen en la BD
  "happiness":              ["femeninas", "infantiles", "deportivas"],
  "navidad":                ["hogar", "hoteles"],
}

/** Quita el prefijo "aroma-" para unificar slugs de BD y catálogo. */
function baseSlug(slug: string): string {
  return slug.replace(/^aroma-/, "")
}

/** Segmentos de un aroma por slug (BD o catálogo). */
export function segmentsForSlug(slug: string): string[] {
  return PRODUCT_SEGMENTS[baseSlug(slug)] ?? []
}

/** Filtra una lista de productos por segmento. */
export function productsBySegment<T extends Pick<Product, "slug">>(
  segmentKey: string,
  pool: T[],
): T[] {
  return pool.filter((p) => (PRODUCT_SEGMENTS[baseSlug(p.slug)] ?? []).includes(segmentKey))
}

/** Segmentos que efectivamente tienen productos en el pool dado, en orden de prioridad. */
export function activeSegments<T extends Pick<Product, "slug">>(pool: T[]): Segment[] {
  return SEGMENTS.filter((s) => pool.some((p) => (PRODUCT_SEGMENTS[baseSlug(p.slug)] ?? []).includes(s.key)))
}
