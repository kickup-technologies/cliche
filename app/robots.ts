import { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://cliche-nine.vercel.app"
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
