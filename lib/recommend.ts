import type { Product } from "@/lib/supabase"
import { getCatalogProduct } from "@/lib/catalog-data"

/**
 * Motor de recomendación content-based + afinidad de sesión.
 * Manda las "señales correctas" combinando varias fuentes:
 *  - Notas aromáticas compartidas con el producto actual (señal fuerte)
 *  - Afinidad con el historial de la sesión (lo que el usuario ha visto,
 *    ponderado: lo más reciente pesa más)
 *  - Cercanía de precio (mismo rango de gasto)
 *  - Popularidad (rating × reseñas)
 * Todo determinista (sin Math.random) para no romper hidratación.
 */
function notesOf(slug: string): string[] {
  return (getCatalogProduct(slug)?.notes ?? []).map((n) => n.toLowerCase())
}

export function recommend(
  current: Product,
  pool: Product[],
  recentSlugs: string[] = [],
  limit = 4,
): Product[] {
  const currentNotes = new Set(notesOf(current.slug))

  // Afinidad: notas de los productos vistos en la sesión (recientes pesan más)
  const affinity = new Map<string, number>()
  recentSlugs
    .filter((s) => s !== current.slug)
    .forEach((s, idx) => {
      const weight = 1 / (idx + 1)
      notesOf(s).forEach((n) => affinity.set(n, (affinity.get(n) ?? 0) + weight))
    })

  const scored = pool
    .filter((p) => p.slug !== current.slug && p.stock > 0)
    .map((p) => {
      const n = notesOf(p.slug)
      let score = 0
      // Notas compartidas con el producto actual
      n.forEach((note) => { if (currentNotes.has(note)) score += 3 })
      // Afinidad con el historial de sesión
      n.forEach((note) => { score += (affinity.get(note) ?? 0) * 2 })
      // Cercanía de precio (hasta +2 si es casi idéntico)
      score += Math.max(0, 2 - Math.abs(p.price - current.price) / 40000)
      // Popularidad
      score += (p.rating ?? 0) * 0.3 + Math.min(2, (p.reviews ?? 0) / 50)
      // Desempate estable por id (sin aleatoriedad)
      score += ((p.id?.charCodeAt(0) ?? 0) % 7) * 0.01
      return { p, score }
    })
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, limit).map((s) => s.p)
}
