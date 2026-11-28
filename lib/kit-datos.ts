import { DEFAULT_WHATSAPP } from "@/components/landing-maqueta/parts"
import { supabase, isSupabaseConfigured, type Product } from "@/lib/supabase"
import { CATALOG_AS_PRODUCTS } from "@/lib/catalog-data"
import { parseFreeShippingThreshold } from "@/lib/pricing"
import { isKitEligible, toKitAroma, type KitAroma } from "@/lib/kit-landing"

/** Datos de SERVIDOR de las landings del armador (/arma-tu-kit y /coleccion-navidad). */

export async function loadAromas(): Promise<KitAroma[]> {
  let products: Product[] = []
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: true })
      if (!error && data?.length) products = data as Product[]
    } catch {
      /* respaldo abajo */
    }
  }
  // Mismo respaldo que /api/products: catálogo local si la BD falla o está vacía.
  if (!products.length) products = CATALOG_AS_PRODUCTS
  // Orden alfabético, como la cuadrícula de la maqueta (Agua, Air Fresh, Aire…).
  return products
    .filter(isKitEligible)
    .map(toKitAroma)
    .sort((a, b) => a.name.localeCompare(b.name, "es"))
}

export async function loadSettings(): Promise<{ freeShippingThreshold: number; whatsappNumber: string }> {
  let threshold: unknown = null
  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .eq("key", "free_shipping_threshold")
      for (const row of data ?? []) threshold = row.value
    } catch {
      /* defaults */
    }
  }
  return {
    freeShippingThreshold: parseFreeShippingThreshold(threshold),
    // Número oficial fijo (lib/entrega): el campo del panel se ignora.
    whatsappNumber: DEFAULT_WHATSAPP,
  }
}

/**
 * Calificación por aroma (la línea "★ 4,8 · 12 reseñas" de la maqueta) SOLO
 * con reseñas reales aprobadas de la tabla `reviews`. Nunca las semilla de
 * reseñas semilla (ya borradas) ni las columnas rating/reviews de `products`: la maqueta
 * traía cifras de referencia y aquí no se publica un número que no exista.
 * Un aroma sin reseñas reales no muestra la línea.
 */
export async function loadRatings(aromas: KitAroma[]): Promise<KitAroma[]> {
  if (!isSupabaseConfigured || !aromas.length) return aromas
  try {
    const { data } = await supabase
      .from("reviews")
      .select("product_id, rating")
      .eq("is_approved", true)
      .in("product_id", aromas.map((a) => a.id))
      .limit(5000)
    const acc = new Map<string, { sum: number; n: number }>()
    for (const r of data ?? []) {
      const v = Number(r.rating)
      if (!Number.isFinite(v) || v < 1 || v > 5) continue
      const k = String(r.product_id)
      const cur = acc.get(k) ?? { sum: 0, n: 0 }
      acc.set(k, { sum: cur.sum + v, n: cur.n + 1 })
    }
    return aromas.map((a) => {
      const s = acc.get(a.id)
      return s ? { ...a, rating: Math.round((s.sum / s.n) * 10) / 10, ratingCount: s.n } : a
    })
  } catch {
    return aromas
  }
}
