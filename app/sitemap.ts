import { MetadataRoute } from "next"
import { supabase } from "@/lib/supabase"
import { siteUrl } from "@/lib/site-url"

/**
 * El sitemap se generaba UNA sola vez, en el build: un producto dado de alta
 * desde el panel admin no aparecía en /sitemap.xml hasta el siguiente deploy,
 * así que Google podía tardar semanas en descubrir la ficha nueva (o no
 * descubrirla nunca). Con ISR se regenera cada hora; además, cada alta/edición
 * /borrado de producto lo revalida al instante (ver revalidateProductPages).
 */
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteUrl()

  const { data: products } = await supabase
    .from("products")
    .select("slug, updated_at")
    .eq("is_active", true)

  const productUrls: MetadataRoute.Sitemap = (products || []).map((p) => ({
    url: `${baseUrl}/productos/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }))

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...["/catalogo", "/ofertas", "/arma-tu-kit", "/nosotros"].map((path) => ({
      url: `${baseUrl}${path}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...["/privacidad", "/terminos", "/cookies"].map((path) => ({
      url: `${baseUrl}${path}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.3,
    })),
    ...productUrls,
  ]
}
