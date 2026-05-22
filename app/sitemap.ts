import { MetadataRoute } from "next"
import { createServerClient } from "@/lib/supabase"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://cliche-nine.vercel.app"

  const supabase = createServerClient()
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
    {
      url: `${baseUrl}/politica-privacidad`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terminos-condiciones`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    ...productUrls,
  ]
}
