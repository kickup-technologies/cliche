import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { KitLanding } from "@/components/kit-landing/kit-landing"
import { supabase, isSupabaseConfigured, type Product } from "@/lib/supabase"
import { CATALOG_AS_PRODUCTS } from "@/lib/catalog-data"
import { parseFreeShippingThreshold } from "@/lib/pricing"
import {
  isKitEligible,
  reviewerDisplayName,
  shortAromaName,
  toKitAroma,
  type KitAroma,
  type KitReview,
} from "@/lib/kit-landing"

/**
 * /arma-tu-kit — landing del kit personalizado (mezclar aromas al precio fijo
 * del kit). Server component: lee aromas, envío gratis, WhatsApp y reseñas
 * reales de la BD; el armador interactivo vive en <KitLanding/>.
 * ISR cada 5 min (igual que el layout) para no consultar la BD por visita.
 */
export const revalidate = 300

const DEFAULT_WHATSAPP = "573122838844"

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
  return products.filter(isKitEligible).map(toKitAroma)
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
 * Testimonios: SOLO reseñas reales aprobadas de la tabla `reviews` (nunca las
 * semilla de lib/seed-reviews). Se exige comentario con contenido y 4★ o más.
 */
async function loadReviews(aromas: KitAroma[]): Promise<KitReview[]> {
  if (!isSupabaseConfigured) return []
  try {
    const { data } = await supabase
      .from("reviews")
      .select("id, product_id, reviewer_name, rating, comment")
      .eq("is_approved", true)
      .gte("rating", 4)
      .order("created_at", { ascending: false })
      .limit(40)
    const nameById = new Map(aromas.map((a) => [a.id, a.name]))
    return (data ?? [])
      .filter((r) => typeof r.comment === "string" && r.comment.trim().length >= 40)
      .slice(0, 6)
      .map((r) => ({
        id: String(r.id),
        name: reviewerDisplayName(String(r.reviewer_name ?? "")),
        rating: Number(r.rating) || 5,
        comment: String(r.comment).trim(),
        aroma: nameById.get(String(r.product_id)) ?? null,
      }))
  } catch {
    return []
  }
}

export default async function ArmaTuKitPage() {
  const [aromas, settings] = await Promise.all([loadAromas(), loadSettings()])
  const reviews = await loadReviews(aromas)
  const christmas = aromas.find((a) => a.slug.replace(/^aroma-/, "") === "navidad") ?? null

  return (
    <>
      <Header />
      <KitLanding
        aromas={aromas}
        reviews={reviews}
        freeShippingThreshold={settings.freeShippingThreshold}
        whatsappNumber={settings.whatsappNumber}
        christmasAromaId={christmas?.id ?? null}
        christmasAromaName={christmas ? shortAromaName(christmas.fullName) : null}
      />
      <Footer />
    </>
  )
}
