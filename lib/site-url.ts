/**
 * URL canónica PÚBLICA del sitio (con www).
 *
 * En Vercel el dominio canónico es www.clichecolombia.com: el apex
 * clichecolombia.com responde 308 Permanent Redirect hacia www. Un navegador
 * sigue esa redirección sin problema, pero los POST de servidor NO sobreviven:
 * Mercado Pago recibía el 308 en la notification_url del webhook y descartaba
 * la notificación → los pagos asíncronos (PSE / botón Bancolombia) nunca se
 * confirmaban (ventas invisibles, incidente del 2026-07-28).
 *
 * Por eso aquí se normaliza SIEMPRE el apex a www, aunque la variable
 * NEXT_PUBLIC_APP_URL esté configurada sin www: ninguna URL que generemos
 * (webhooks, back_urls, correos, sitemap) debe pasar por esa redirección.
 */
export function siteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || "https://www.clichecolombia.com").replace(/\/+$/, "")
  return raw.replace(/^https?:\/\/clichecolombia\.com$/i, "https://www.clichecolombia.com")
}
