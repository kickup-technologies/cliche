import { parseVariantId } from "@/lib/pricing"

/**
 * content_ids del CATÁLOGO para Meta (los mismos ids que publica /api/meta-feed:
 * el UUID del producto). Las líneas del carrito usan ids internos que el
 * catálogo no conoce — "uuid::x4" para un kit de un aroma y "pack::x3::…" para
 * un kit personalizado — y con ellos Meta no puede cruzar el evento con el
 * producto (anuncios dinámicos, informes por producto).
 *
 * - "uuid::tier" → "uuid"
 * - kit personalizado → los UUID de los aromas que lo componen
 */
export function catalogContentIds(
  lines: Array<{ id?: string | null; components?: Array<{ product_id?: string | null }> | null }>,
): string[] {
  const out = new Set<string>()
  for (const line of lines) {
    const comps = Array.isArray(line.components) ? line.components : []
    if (comps.length) {
      for (const c of comps) if (c.product_id) out.add(parseVariantId(String(c.product_id)).baseId)
    } else if (line.id && !String(line.id).startsWith("pack::")) {
      out.add(parseVariantId(String(line.id)).baseId)
    }
  }
  return [...out]
}
