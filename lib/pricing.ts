/**
 * Tabla de precios de Cliché — cada aroma se vende por unidad o en kit
 * (mismo aroma). Precios FIJOS por tier (no son múltiplos del unitario).
 * Fuente única usada por la ficha de producto y validada en el checkout.
 */
export interface PriceTier {
  id: string
  units: number
  price: number
  label: string
  badge?: string
}

export const UNIT_PRICE = 78000

// ── Envío (fuente ÚNICA) ──────────────────────────────────────────────────
// Antes 300000/20500 estaban hardcodeados en 6 archivos y el knob
// `free_shipping_threshold` del admin no afectaba el cobro. Ahora todos
// importan de aquí, y el umbral se lee del setting con este fallback.
export const SHIPPING_COST = 20_500
export const DEFAULT_FREE_SHIPPING_THRESHOLD = 300_000

/** Umbral de envío gratis desde el setting del admin, con fallback robusto. */
export function parseFreeShippingThreshold(raw: unknown): number {
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_FREE_SHIPPING_THRESHOLD
}

export const PRICE_TIERS: PriceTier[] = [
  { id: "unit", units: 1, price: 78000,  label: "1 unidad" },
  { id: "x3",   units: 3, price: 145000, label: "Kit x3" },
  { id: "x4",   units: 4, price: 190000, label: "Kit x4", badge: "Más popular" },
  { id: "x6",   units: 6, price: 280000, label: "Kit x6", badge: "Mejor precio" },
]

export const TIER_BY_ID: Record<string, PriceTier> = Object.fromEntries(
  PRICE_TIERS.map((t) => [t.id, t]),
)

const SEP = "::"

/** id de carrito para una variante: el unitario conserva el id real del producto. */
export function makeVariantId(productId: string, tierId: string): string {
  return tierId === "unit" ? productId : `${productId}${SEP}${tierId}`
}

/** separa un id de variante en { id base del producto, tier }. */
export function parseVariantId(id: string): { baseId: string; tier: PriceTier } {
  const idx = id.indexOf(SEP)
  if (idx === -1) return { baseId: id, tier: TIER_BY_ID["unit"] }
  const baseId = id.slice(0, idx)
  const tierId = id.slice(idx + SEP.length)
  return { baseId, tier: TIER_BY_ID[tierId] ?? TIER_BY_ID["unit"] }
}

/** ahorro de un kit frente a comprar las unidades sueltas. */
export function tierSavings(tier: PriceTier): number {
  return Math.max(0, tier.units * UNIT_PRICE - tier.price)
}
