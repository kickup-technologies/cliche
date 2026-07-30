import { MetadataRoute } from "next"
import { siteUrl } from "@/lib/site-url"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = siteUrl()
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin-cliche-secret", "/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
