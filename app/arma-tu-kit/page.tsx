import { KitLanding } from "@/components/kit-landing/kit-landing"
import { DEFAULT_WHATSAPP } from "@/components/landing-maqueta/parts"
import { supabase, isSupabaseConfigured, type Product } from "@/lib/supabase"
import { CATALOG_AS_PRODUCTS } from "@/lib/catalog-data"
import { parseFreeShippingThreshold } from "@/lib/pricing"
import { isKitEligible, shortAromaName, toKitAroma, type KitAroma } from "@/lib/kit-landing"
import { CHRISTMAS_DEADLINE } from "@/lib/kit-landing-content"

/**
 * /arma-tu-kit — landing del kit personalizado (mezclar aromas al precio fijo
 * del kit) con el diseño de la maqueta de Cliché, tal cual. Sin el Header ni
 * el Footer de la tienda: la maqueta trae su propia cabecera (logo + WhatsApp)
 * y su pie legal, y es una página de destino de pauta.
 *
 * Server component: lee aromas, envío gratis, WhatsApp y calificaciones reales
 * de la BD; el armador interactivo vive en <KitLanding/>.
 * ISR cada 5 min (igual que el layout) para no consultar la BD por visita.
 */
export const revalidate = 3600

async function loadAromas(): Promise<KitAroma[]> {
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

async function loadSettings(): Promise<{ freeShippingThreshold: number; whatsappNumber: string }> {
  let threshold: unknown = null
  let whatsapp: unknown = null
  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["free_shipping_threshold", "whatsapp_number"])
      for (const row of data ?? []) {
        if (row.key === "free_shipping_threshold") threshold = row.value
        if (row.key === "whatsapp_number") whatsapp = row.value
      }
    } catch {
      /* defaults */
    }
  }
  const digits = typeof whatsapp === "string" ? whatsapp.replace(/\D/g, "") : ""
  return {
    freeShippingThreshold: parseFreeShippingThreshold(threshold),
    whatsappNumber: digits.length >= 10 ? digits : DEFAULT_WHATSAPP,
  }
}

/**
 * Calificación por aroma (la línea "★ 4,8 · 12 reseñas" de la maqueta) SOLO
 * con reseñas reales aprobadas de la tabla `reviews`. Nunca las semilla de
 * reseñas semilla (ya borradas) ni las columnas rating/reviews de `products`: la maqueta
 * traía cifras de referencia y aquí no se publica un número que no exista.
 * Un aroma sin reseñas reales no muestra la línea.
 */
async function loadRatings(aromas: KitAroma[]): Promise<KitAroma[]> {
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

export default async function ArmaTuKitPage() {
  const [baseAromas, settings] = await Promise.all([loadAromas(), loadSettings()])
  const aromas = await loadRatings(baseAromas)
  const christmas = aromas.find((a) => a.slug.replace(/^aroma-/, "") === "navidad") ?? null
  // Se evalúa en cada regeneración (ISR 5 min): la fecha límite se apaga sola.
  const beforeChristmasDeadline = Date.now() <= Date.parse(CHRISTMAS_DEADLINE)

  return (
    <KitLanding
      aromas={aromas}
      freeShippingThreshold={settings.freeShippingThreshold}
      whatsappNumber={settings.whatsappNumber}
      christmasAromaId={christmas?.id ?? null}
      christmasAromaName={christmas ? shortAromaName(christmas.fullName) : null}
      showChristmasDeadline={beforeChristmasDeadline}
    />
  )
}
