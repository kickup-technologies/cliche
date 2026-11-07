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

/**
 * Familia por slug, para productos sin categoría asignada en el panel (hoy
 * los 25). Corregida el 7-nov-2026 según lo que dice la ETIQUETA del frasco
 * (y el documento de distribuidores cuando coincide con ella). Donde la
 * etiqueta solo trae una frase, manda lo que esa frase describe; Lycra de
 * Verano, Seda del Lejano Oriente y Navidad no traen pistas en la etiqueta y
 * quedan por sus notas de la BD hasta que la marca confirme la fórmula.
 */
export const FAMILY_MAP: Record<string, string> = {
  // Cítricos — Agua: clementina, chabacano, lirio del valle · Índigo Profundo:
  // naranja, artemisa, lavanda · Brillos de Seda: "aromáticas, cítricas y
  // florales" · Lycra de Verano: por la BD
  "agua": "citricos", "indigo-profundo": "citricos", "brillos-seda": "citricos",
  "brillos-de-seda": "citricos", "lycra-de-verano": "citricos",
  // Frescos — Aire: té verde, lima, almizcle · Air Fresh: vainilla, té verde,
  // bambú · Frescura de Lino: manzano, mandarina, fresia · Vientos de Lino:
  // "cítricas y suaves, brisa ligera como el lino" · Best Friends: toronja,
  // melón, jazmín (etiqueta anterior)
  "aire": "frescos", "air-fresh": "frescos", "frescura-de-lino": "frescos",
  "vientos-de-lino": "frescos", "best-friends": "frescos",
  // Florales — Tierra: "Florales" · Sello de Dios: rosas blancas · Hilos de
  // Seda: "árbol de cerezo" · Romeo y Julieta: rosa, jazmín
  "tierra": "florales", "sello-de-dios": "florales", "hilos-de-seda": "florales",
  "romeo-y-julieta": "florales",
  // Dulces — Dulce Lana: "tonos dulces" · Calor de Lana: frutales y almizcles ·
  // Mahai: frutas exóticas · Happiness: almendra, rosa, vainilla · Coconut,
  // Watermelon y Sugar Pop
  "dulce-lana": "dulces", "calor-de-lana": "dulces", "mahai": "dulces", "happiness": "dulces",
  "coconut": "dulces", "watermelon": "dulces", "sugar-pop": "dulces",
  // Amaderados — Eternamente Índigo: "denim, bosque y naturaleza" · Tao:
  // "orientales" · Luxury · Navidad: "navideñas" · Seda del Lejano Oriente: por la BD
  "eternamente-indigo": "amaderados", "tao": "amaderados", "luxury": "amaderados",
  "navidad": "amaderados", "seda-del-lejano-oriente": "amaderados",
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
