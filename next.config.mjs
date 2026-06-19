/** @type {import('next').NextConfig} */

// Cabeceras de seguridad aplicadas a todo el sitio.
// CSP permisiva con scripts/estilos de terceros (analítica, chat) pero que SÍ
// bloquea plugins/embeds (object-src), inyección de <base>, exfiltración por
// formularios a terceros (form-action) y clickjacking (frame-ancestors), y
// fuerza HTTPS. Endurece sin romper la tienda.
const ContentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https: wss: blob: data:",
  "media-src 'self' https: blob:",
  "frame-src 'self' https:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ")

const securityHeaders = [
  { key: "Content-Security-Policy", value: ContentSecurityPolicy },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
]

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  poweredByHeader: false, // no revelar "X-Powered-By: Next.js"
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
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }]
  },
}

export default nextConfig
