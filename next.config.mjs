/** @type {import('next').NextConfig} */

// Cabeceras de seguridad aplicadas a todo el sitio.
// CSP permisiva con scripts/estilos de terceros (analítica, chat) pero que SÍ
// bloquea plugins/embeds (object-src), inyección de <base>, exfiltración por
// formularios a terceros (form-action) y clickjacking (frame-ancestors), y
// fuerza HTTPS. Endurece sin romper la tienda.
//
// ⚠️ NO ROMPER LOS RENDERS 3D AL REFORZAR SEGURIDAD ⚠️
// Los visores 3D (three.js / react-three-fiber, MeshyViewer/SprayBottle3D)
// cargan las TEXTURAS WebP embebidas en los .glb haciendo `fetch()` a URLs
// `blob:` y decodificándolas con `createImageBitmap`. Si la CSP no permite
// `blob:` (y `data:`) en `connect-src` e `img-src`, las texturas se bloquean
// ("Failed to fetch") y los frascos salen EN BLANCO (geometría sin textura).
// REGLA: `connect-src` e `img-src` SIEMPRE deben incluir `blob:` y `data:`,
// y `worker-src` debe permitir `blob:`. No los quites al endurecer la CSP.
// (Ya nos pasó una vez: el frasco se veía blanco por esto.)
// Allowlist de orígenes de SCRIPTS de terceros que la tienda carga de verdad
// (analítica + social proof + Vercel). Restringir script-src a esta lista —en
// vez de un `https:` abierto— impide que una inyección cargue un <script> desde
// un dominio atacante. Si añades un proveedor nuevo, agrégalo aquí.
//   connect.facebook.net → Meta Pixel · googletagmanager/google-analytics → GA4
//   analytics.tiktok.com → TikTok · *.clarity.ms → Clarity · cdn.prooffactor → social proof
//   va.vercel-scripts.com → Vercel Analytics
const SCRIPT_SRC = [
  "'self'", "'unsafe-inline'", "'unsafe-eval'",
  "https://connect.facebook.net",
  "https://www.googletagmanager.com",
  "https://*.google-analytics.com",
  "https://analytics.tiktok.com",
  "https://*.clarity.ms",
  "https://cdn.prooffactor.com",
  "https://va.vercel-scripts.com",
].join(" ")

const ContentSecurityPolicy = [
  "default-src 'self'",
  `script-src ${SCRIPT_SRC}`,
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' data: blob: https:",                 // blob:/data: → texturas 3D (NO quitar)
  "font-src 'self' data: https:",
  "connect-src 'self' https: wss: blob: data:",        // blob:/data: → texturas 3D (NO quitar)
  "media-src 'self' https: blob:",
  "frame-src 'self' https:",                            // https: → checkout Mercado Pago
  "worker-src 'self' blob:",                            // blob: → decodificadores 3D (NO quitar)
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
  // Aísla el contexto de navegación de otras ventanas (mitiga tabnabbing y
  // XS-Leaks). "allow-popups" preserva flujos que abran popup (p. ej. OAuth).
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
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
  // Rutas legales antiguas/huérfanas → redirigen (301) a las canónicas que enlaza
  // el footer. Evita contenido duplicado en Google y enlaces externos rotos.
  async redirects() {
    return [
      { source: "/politica-privacidad", destination: "/privacidad", permanent: true },
      { source: "/terminos-condiciones", destination: "/terminos", permanent: true },
      // /productos sin slug no existe como página (las fichas viven en
      // /productos/[slug]) y daba un 404: es una URL que la gente teclea o
      // adivina, así que mejor llevarla al catálogo. El redirect es exacto y
      // no toca las fichas.
      { source: "/productos", destination: "/catalogo", permanent: true },
    ]
  },
}

export default nextConfig
