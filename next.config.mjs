/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Optimización activada: Next sirve AVIF/WebP del tamaño exacto por
    // dispositivo y los cachea en el edge → rápido y escalable a miles de visitas
    // sin perder calidad. (antes: unoptimized:true = imágenes originales completas)
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2678400, // 31 días de caché del optimizado
    remotePatterns: [
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "clichecolombia.com" },
    ],
  },
}

export default nextConfig
