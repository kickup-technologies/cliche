/**
 * Familias olfativas del catálogo — fuente única compartida por la página
 * pública (/catalogo) y el editor visual del panel admin, para que ambos
 * agrupen los aromas EXACTAMENTE igual.
 */

export const FAMILIES = [
  { value: "citricos", label: "Cítricos", tag: "Frescos y luminosos. Energía que despierta el ambiente." },
  { value: "florales", label: "Florales", tag: "Delicados y sofisticados. Una firma elegante." },
  { value: "amaderados", label: "Amaderados", tag: "Cálidos y envolventes, con carácter y profundidad." },
  { value: "dulces", label: "Dulces", tag: "Acogedores y reconfortantes. Sensación de hogar." },
  { value: "frescos", label: "Frescos", tag: "Limpios y aireados. Sensación de recién lavado." },
] as const

export type FamilyValue = (typeof FAMILIES)[number]["value"]

/**
 * Valor especial de `product.category` que saca al aroma de TODAS las
 * familias del catálogo (lo asigna el editor de catálogo del admin al
 * "quitar" un aroma sin moverlo a otra familia).
 */
export const SIN_FAMILIA = "ninguna"

/** Mapeo histórico por slug, para productos sin categoría asignada. */
export const FAMILY_MAP: Record<string, string> = {
  "dulce-lana": "citricos", "brillos-de-seda": "citricos", "agua": "citricos",
  "aire": "citricos", "frescura-de-lino": "citricos",
  "vientos-de-lino": "florales", "sello-de-dios": "florales", "lycra-de-verano": "florales",
  "tao": "florales", "romeo-y-julieta": "florales", "hilos-de-seda": "florales",
  "seda-del-lejano-oriente": "florales",
  "eternamente-indigo": "amaderados", "indigo-profundo": "amaderados",
  "luxury": "amaderados", "tierra": "amaderados",
  "calor-de-lana": "dulces", "mahai": "dulces", "coconut": "dulces", "watermelon": "dulces",
  "best-friends": "frescos", "air-fresh": "frescos",
}

/**
 * Familia efectiva de un producto: manda la categoría del admin; si no está
 * asignada se cae al mapeo histórico por slug (para no romper los productos
 * existentes). Devuelve null si el admin lo sacó del catálogo por familias.
 */
export function familyOf(p: { slug: string; category?: string | null }): string | null {
  if (p.category === SIN_FAMILIA) return null
  if (p.category && FAMILIES.some((f) => f.value === p.category)) return p.category
  return FAMILY_MAP[p.slug.replace(/^aroma-/, "")] ?? "frescos"
}
