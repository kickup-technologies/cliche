import { createServerClient } from "@/lib/supabase"
import { parseHeroOverrides, type HeroOverride } from "@/lib/editorial-hero"

/**
 * Overrides del hero guardados desde el panel (site_settings, clave
 * `editorial_hero`, JSON). Solo lo lee el servidor (service_role): la clave
 * NO está en la allowlist pública de /api/settings. Si la BD falla se
 * devuelve [] y la portada usa sus diapositivas de fábrica.
 */
export async function getHeroOverrides(): Promise<HeroOverride[]> {
  try {
    const { data, error } = await createServerClient()
      .from("site_settings")
      .select("value")
      .eq("key", "editorial_hero")
      .maybeSingle()
    if (error || !data?.value) return []
    return parseHeroOverrides(data.value)
  } catch {
    return []
  }
}
