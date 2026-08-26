/**
 * lib/mailer.ts — SMTP email sender (nodemailer)
 *
 * Env vars needed in Vercel / .env.local:
 *   SMTP_HOST     smtp.gmail.com
 *   SMTP_PORT     587  (TLS) or 465 (SSL)
 *   SMTP_SECURE   false  (true only for port 465)
 *   SMTP_USER     Clichepromocionales@gmail.com
 *   SMTP_PASS     app-password de 16 caracteres
 *   SMTP_FROM     Cliché Aromas <Clichepromocionales@gmail.com>
 *
 * While env vars are missing the functions log a warning and return — no crash.
 *
 * ── Diseño de los correos ──
 * Sistema minimalista compartido (shell): fondo crema, tarjeta blanca con
 * borde fino (sin gradientes ni sombras pesadas), wordmark serif, kicker en
 * mayúsculas espaciadas y pie discreto. Cada correo aporta SOLO su motivo
 * propio (código, recibo, guía, estrellas…) sobre esa base.
 */

import nodemailer from "nodemailer"
import { createServerClient } from "@/lib/supabase"
import { carrierName, trackingUrl } from "@/lib/carriers"
import { siteUrl } from "@/lib/site-url"

/**
 * Host para URLs dentro de un CORREO. El apex clichecolombia.com responde
 * 308 → www y varios clientes de correo no siguen redirects al cargar
 * imágenes (logo/fotos rotos). En el navegador el redirect es transparente,
 * así que en correos usamos SIEMPRE el host www directo (200, sin redirect):
 * así el logo se ve como imagen normal, NO como archivo adjunto.
 */
function emailHost(): string {
  return siteUrl()
}

/**
 * URL absoluta para usar dentro de un CORREO: las rutas relativas de la BD
 * ("/images/…") funcionan en la web pero en el email no apuntan a nada.
 */
function absUrl(src: string): string {
  return src.startsWith("http") ? src : `${emailHost()}${src}`
}

// Redes sociales de la marca (para el bloque "Síguenos" del pie).
const SOCIAL = {
  instagram: "https://www.instagram.com/clichearomasoficial",
  tiktok: "https://www.tiktok.com/@clichearomasoficial",
}

/**
 * Imágenes de producto para los correos: busca en la BD la foto de cada
 * product_id. Falla en silencio (correo sin fotos > correo no enviado).
 */
async function imagesByProductId(
  items: Array<{ product_id?: string }>
): Promise<Record<string, string>> {
  try {
    const ids = [...new Set(items.map((i) => i.product_id).filter(Boolean))] as string[]
    if (!ids.length) return {}
    const db = createServerClient()
    const { data } = await db.from("products").select("id, image_url, image_urls").in("id", ids)
    const map: Record<string, string> = {}
    for (const p of data || []) {
      const img = p.image_url || p.image_urls?.[0]
      if (img) map[p.id] = absUrl(img)
    }
    return map
  } catch {
    return {}
  }
}

/** Celda con la foto del producto (56px, esquinas suaves) o vacía si no hay. */
function thumbCell(src: string | undefined, alt: string): string {
  if (!src) return `<td style="width:0;padding:0;border-bottom:1px solid #EDE5DF;"></td>`
  return `<td style="width:66px;padding:10px 10px 10px 0;vertical-align:middle;border-bottom:1px solid #EDE5DF;">
    <img src="${src}" alt="${alt}" width="56" height="56" style="display:block;width:56px;height:56px;object-fit:cover;border-radius:12px;border:1px solid #EDE5DF;"/>
  </td>`
}

function createTransport() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
}

const FROM = process.env.SMTP_FROM ?? "Cliché Aromas <monica@clichecolombia.com>"

// ── Paleta y utilidades del sistema de diseño ────────────────────────────────
const C = {
  bg: "#FAF8F5",      // crema
  ink: "#2D1A14",     // café
  sub: "#6F5D55",     // texto secundario
  faint: "#A99B93",   // texto terciario / pie
  line: "#EDE5DF",    // hairlines
  accent: "#A67163",  // terracota
}

const fmtCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n)

const appUrl = () => emailHost()

/** Botón pill oscuro, único elemento "sólido" de cada correo. */
function button(href: string, label: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:6px 0 2px;">
    <a href="${href}" style="display:inline-block;background:${C.ink};color:#ffffff;text-decoration:none;padding:14px 42px;border-radius:100px;font-family:Georgia,serif;font-size:14px;letter-spacing:.04em;">${label}</a>
  </td></tr></table>`
}

/** Kicker: etiqueta corta en mayúsculas espaciadas, terracota. */
function kicker(text: string): string {
  return `<p style="margin:0 0 14px;font-family:Arial,sans-serif;font-size:10px;letter-spacing:.32em;text-transform:uppercase;color:${C.accent};">${text}</p>`
}

/** Título serif grande. */
function title(text: string): string {
  return `<h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:26px;line-height:1.3;font-weight:400;color:${C.ink};">${text}</h1>`
}

/** Párrafo secundario. */
function para(text: string, mb = 30): string {
  return `<p style="margin:0 0 ${mb}px;font-family:Georgia,serif;font-size:15px;line-height:1.75;color:${C.sub};">${text}</p>`
}

/** Hairline separador. */
const hr = `<div style="height:1px;background:${C.line};margin:30px 0;"></div>`

/**
 * Cascarón compartido: fondo crema → tarjeta blanca de 520px con borde fino,
 * wordmark arriba, contenido centrado por cada correo y pie mínimo.
 */
function shell(content: string, footNote: string): string {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta name="color-scheme" content="light"/><meta name="supported-color-schemes" content="light"/></head>
<body style="margin:0;padding:0;background:${C.bg};">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:52px 16px;"><tr><td align="center">

  <!-- Logo de la marca (imagen remota al host www directo → se ve natural,
       NO como archivo adjunto) -->
  <img src="${emailHost()}/images/logo-cliche.png" alt="Clich&eacute;" height="46" style="height:46px;width:auto;display:block;margin:0 auto 26px;"/>

  <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#ffffff;border:1px solid ${C.line};border-radius:20px;">
    <tr><td style="padding:46px 42px;">
      ${content}
    </td></tr>
  </table>

  <!-- Síguenos en redes: iconos-botón con el enlace oculto (solo se ve el icono) -->
  <p style="margin:30px 0 12px;font-family:Arial,sans-serif;font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:${C.faint};">S&iacute;guenos en nuestras redes</p>
  <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
    <td style="padding:0 7px;">
      <a href="${SOCIAL.instagram}" target="_blank" style="text-decoration:none;">
        <img src="${emailHost()}/images/email/instagram.png" alt="Instagram" width="40" height="40" style="width:40px;height:40px;display:block;border:0;"/>
      </a>
    </td>
    <td style="padding:0 7px;">
      <a href="${SOCIAL.tiktok}" target="_blank" style="text-decoration:none;">
        <img src="${emailHost()}/images/email/tiktok.png" alt="TikTok" width="40" height="40" style="width:40px;height:40px;display:block;border:0;"/>
      </a>
    </td>
  </tr></table>

  <!-- Pie -->
  <p style="margin:24px 0 4px;font-family:Arial,sans-serif;font-size:11px;color:${C.faint};">Clich&eacute; Aromas &middot; Colombia</p>
  <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:${C.faint};">${footNote}</p>

</td></tr></table>
</body></html>`
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. Código de seguridad del panel admin — motivo: el código, nada más.
// ═════════════════════════════════════════════════════════════════════════════
export async function sendAdminOtpEmail(to: string, code: string): Promise<boolean> {
  const transport = createTransport()
  if (!transport) {
    console.warn("[mailer] SMTP not configured — no se pudo enviar el código admin")
    return false
  }

  const content = `
    <div style="text-align:center;">
      ${kicker("Acceso al panel")}
      ${title("Tu c&oacute;digo de seguridad")}
      ${para("Escr&iacute;belo en el panel para entrar. Vence en 10 minutos.", 26)}
      <div style="display:inline-block;border:1px solid ${C.line};border-radius:16px;padding:20px 38px;">
        <span style="font-family:'Courier New',monospace;font-size:40px;letter-spacing:.35em;color:${C.ink};">${code}</span>
      </div>
      <p style="margin:26px 0 0;font-family:Arial,sans-serif;font-size:12px;color:${C.faint};">Si no intentaste entrar, ignora este correo y cambia tu contrase&ntilde;a.</p>
    </div>`

  await transport.sendMail({
    from: FROM,
    to,
    subject: `${code} es tu código de acceso al panel`,
    text: `Tu código de acceso al panel admin de Cliché es: ${code} (vence en 10 minutos).`,
    html: shell(content, "Correo de seguridad generado autom&aacute;ticamente."),  })
  return true
}

// ═════════════════════════════════════════════════════════════════════════════
// 1b. Código para restablecer contraseña (cliente) — desde NUESTRO dominio.
// ═════════════════════════════════════════════════════════════════════════════
export async function sendPasswordResetCode(to: string, code: string): Promise<boolean> {
  const transport = createTransport()
  if (!transport) {
    console.warn("[mailer] SMTP not configured — no se pudo enviar el código de contraseña")
    return false
  }

  const content = `
    <div style="text-align:center;">
      ${kicker("Restablecer contrase&ntilde;a")}
      ${title("Tu c&oacute;digo de seguridad")}
      ${para("Escr&iacute;belo en la p&aacute;gina para crear una nueva contrase&ntilde;a. Vence en 10 minutos.", 26)}
      <div style="display:inline-block;border:1px solid ${C.line};border-radius:16px;padding:20px 38px;">
        <span style="font-family:'Courier New',monospace;font-size:40px;letter-spacing:.35em;color:${C.ink};">${code}</span>
      </div>
      <p style="margin:26px 0 0;font-family:Arial,sans-serif;font-size:12px;color:${C.faint};">Si no pediste cambiar tu contrase&ntilde;a, ignora este correo: tu cuenta sigue segura.</p>
    </div>`

  try {
    await transport.sendMail({
      from: FROM,
      to,
      subject: `${code} es tu código para cambiar tu contraseña — Cliché`,
      text: `Tu código para restablecer tu contraseña en Cliché es: ${code} (vence en 10 minutos). Si no lo pediste, ignora este correo.`,
      html: shell(content, "Solicitud de cambio de contrase&ntilde;a en clichecolombia.com."),
    })
    return true
  } catch (err) {
    console.error("[mailer] password reset code failed:", err)
    return false
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. Bienvenida — motivo: dar la bienvenida a la comunidad, sin descuento.
//    (El código de bienvenida se eliminó el 2026-07-30 por decisión del negocio.)
// ═════════════════════════════════════════════════════════════════════════════
export async function sendWelcomeEmail(to: string): Promise<void> {
  const transport = createTransport()
  if (!transport) {
    console.warn("[mailer] SMTP not configured — skipping welcome email")
    return
  }

  const content = `
    <div style="text-align:center;">
      ${kicker("Te damos la bienvenida")}
      ${title("Deja que tu historia comience<br/>con nuestro aroma.")}
      ${para("Gracias por unirte a Clich&eacute;. Cada espacio guarda una historia — y la tuya merece un aroma propio. Desde hoy recibir&aacute;s ideas de marketing olfativo, novedades de la casa y acceso a los lanzamientos antes que nadie.", 28)}
      ${button(`${appUrl()}/catalogo`, "Descubrir los aromas")}
      ${hr}
      <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:1.9;color:${C.faint};">
        Env&iacute;o gratis desde $300.000 &nbsp;&middot;&nbsp; Garant&iacute;a de 30 d&iacute;as &nbsp;&middot;&nbsp; Hecho en Colombia
      </p>
    </div>`

  try {
    await transport.sendMail({
      from: FROM,
      to,
      subject: "Te damos la bienvenida — Cliché Aromas",
      html: shell(content, "Recibiste este correo porque te suscribiste en clichecolombia.com."),    })
    console.log("[mailer] Welcome email sent")
  } catch (err) {
    console.error("[mailer] Failed to send welcome email:", err)
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. Confirmación de compra — motivo: recibo sereno con check.
// ═════════════════════════════════════════════════════════════════════════════
export async function sendOrderConfirmation(
  to: string,
  order: {
    id: string
    total: number
    items: Array<{ product_id: string; quantity: number; name?: string; price?: number }>
    // ── Opcionales (retrocompatibles): si el llamador los pasa, el recibo
    //    desglosa subtotal/envío/descuento y muestra a quién y dónde se envía.
    //    Si faltan, el correo se ve igual que antes (solo "Total pagado"). ──
    customerName?: string | null
    shippingAddress?: { address: string; city: string; department: string; notes?: string | null } | null
    discountCode?: string | null
    discountAmount?: number | null
  }
): Promise<void> {
  const transport = createTransport()
  if (!transport) { console.warn("[mailer] SMTP not configured — skipping order confirmation"); return }

  const orderId = order.id.slice(-8).toUpperCase()
  // total viene en pesos (entero), NO en centavos — no dividir por 100
  const imgs = await imagesByProductId(order.items || [])
  const rows = (order.items || [])
    .map((it) => `
      <tr>
        ${thumbCell(it.product_id ? imgs[it.product_id] : undefined, it.name ?? "Producto")}
        <td style="padding:11px 0;border-bottom:1px solid ${C.line};font-family:Georgia,serif;font-size:14px;color:${C.ink};">${it.name ?? "Producto"}&nbsp;<span style="color:${C.faint};font-size:12px;">&times;${it.quantity}</span></td>
        <td align="right" style="padding:11px 0;border-bottom:1px solid ${C.line};font-family:Georgia,serif;font-size:14px;color:${C.sub};">${it.price ? fmtCOP(it.price * it.quantity) : ""}</td>
      </tr>`)
    .join("")

  // ── Desglose del recibo ──
  // El total del checkout se calculó como subtotal + envío − descuento, pero la
  // orden solo guarda el total: reconstruimos subtotal sumando las líneas y de
  // ahí derivamos el envío. Solo mostramos el desglose si TODAS las líneas
  // traen precio y las cuentas cierran — un recibo sin desglose es mejor que
  // uno con números que no suman.
  const items = order.items || []
  const discount = Math.max(0, Math.round(order.discountAmount ?? 0))
  const allPriced = items.length > 0 && items.every((it) => typeof it.price === "number" && it.price > 0)
  const subtotal = allPriced ? items.reduce((s, it) => s + (it.price as number) * it.quantity, 0) : 0
  const shippingCost = allPriced ? order.total - subtotal + discount : -1
  const canBreakDown = allPriced && shippingCost >= 0

  const summaryRow = (label: string, value: string) => `
      <tr>
        <td colspan="2" style="padding:11px 0 0;font-family:Georgia,serif;font-size:14px;color:${C.sub};">${label}</td>
        <td align="right" style="padding:11px 0 0;font-family:Georgia,serif;font-size:14px;color:${C.sub};">${value}</td>
      </tr>`
  const breakdown = canBreakDown
    ? `
      ${summaryRow("Subtotal", fmtCOP(subtotal))}
      ${discount > 0 ? summaryRow(`Descuento${order.discountCode ? ` (${order.discountCode})` : ""}`, `&minus;${fmtCOP(discount)}`) : ""}
      ${summaryRow("Env&iacute;o", shippingCost === 0 ? "Env&iacute;o gratis" : fmtCOP(shippingCost))}`
    : ""

  // ── Datos de entrega: a quién y dónde llega el paquete ──
  const addr = order.shippingAddress
  const deliveryLines = [
    order.customerName?.trim() || "",
    addr ? `${addr.address}, ${addr.city}, ${addr.department}` : "",
    addr?.notes?.trim() || "",
  ].filter(Boolean)
  const deliveryBlock = deliveryLines.length
    ? `
    ${hr}
    <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:${C.faint};text-align:center;">Datos de entrega</p>
    <p style="margin:0;font-family:Georgia,serif;font-size:14px;line-height:1.8;color:${C.sub};text-align:center;">${deliveryLines.join("<br/>")}</p>`
    : ""

  const content = `
    <div style="text-align:center;">
      <div style="display:inline-block;width:44px;height:44px;line-height:44px;border:1px solid ${C.accent};border-radius:100px;color:${C.accent};font-family:Georgia,serif;font-size:20px;margin-bottom:18px;">&#10003;</div>
      ${kicker("Pedido confirmado")}
      ${title("Gracias por tu compra.")}
      ${para(`Tu pago fue confirmado y ya estamos preparando tu pedido <span style="font-family:'Courier New',monospace;color:${C.ink};">#${orderId}</span> con cuidado. Te avisaremos cuando salga en camino.`, 8)}
    </div>
    ${hr}
    <table width="100%" cellpadding="0" cellspacing="0">
      ${rows}
      ${breakdown}
      <tr>
        <td colspan="2" style="padding:14px 0 0;font-family:Georgia,serif;font-size:15px;color:${C.ink};">Total pagado</td>
        <td align="right" style="padding:14px 0 0;font-family:Georgia,serif;font-size:17px;color:${C.ink};">${fmtCOP(order.total)}</td>
      </tr>
    </table>
    ${deliveryBlock}
    <div style="height:30px;"></div>
    ${button(`${appUrl()}/pedido/${order.id}`, "Seguir mi pedido")}`

  try {
    await transport.sendMail({
      from: FROM,
      to,
      subject: `Pedido #${orderId} confirmado — Cliché Aromas`,
      html: shell(content, "Guarda este correo como comprobante de tu compra."),    })
  } catch (err) { console.error("[mailer] Order confirmation failed:", err) }
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. Pedido enviado — motivo: número de guía protagonista.
// ═════════════════════════════════════════════════════════════════════════════
export async function sendOrderShippedEmail(
  to: string,
  order: {
    id: string
    customerName?: string | null
    trackingNumber?: string | null
    carrier?: string | null
    items?: Array<{ product_id?: string; name?: string; quantity?: number }>
  }
): Promise<void> {
  const transport = createTransport()
  if (!transport) { console.warn("[mailer] SMTP not configured — skipping shipped email"); return }

  const orderId = order.id.slice(-8).toUpperCase()
  const name = (order.customerName || "").trim().split(/\s+/)[0]
  const guide = order.trackingNumber?.trim()
  // Transportista + link de rastreo con la guía (FedEx/UPS la pre-cargan;
  // Servientrega/Interrapidísimo abren su página de rastreo — la guía va arriba).
  const carrierLabel = carrierName(order.carrier)
  const trackUrl = trackingUrl(order.carrier, guide)

  // Fotos de lo que va en la caja
  const items = order.items || []
  const imgs = await imagesByProductId(items)
  const itemRows = items.slice(0, 4).map((it) => `
    <tr>
      ${thumbCell(it.product_id ? imgs[it.product_id] : undefined, it.name || "Producto")}
      <td style="padding:10px 0;border-bottom:1px solid ${C.line};font-family:Georgia,serif;font-size:14px;color:${C.ink};text-align:left;">${it.name ?? "Producto"}${it.quantity && it.quantity > 1 ? ` <span style="color:${C.faint};font-size:12px;">&times;${it.quantity}</span>` : ""}</td>
    </tr>`).join("")

  const content = `
    <div style="text-align:center;">
      ${kicker("En camino")}
      ${title(`${name ? name + ", tu" : "Tu"} aroma va en camino.`)}
      ${para(`El pedido <span style="font-family:'Courier New',monospace;color:${C.ink};">#${orderId}</span> ya sali&oacute; de nuestro taller. Muy pronto tu espacio va a oler distinto.`, guide ? 26 : 30)}
      ${guide ? `
      <div style="border:1px solid ${C.line};border-radius:16px;padding:20px;margin-bottom:26px;">
        ${carrierLabel ? `<p style="margin:0 0 10px;font-family:Georgia,serif;font-size:14px;color:${C.sub};">Transportadora: <span style="color:${C.ink};">${carrierLabel}</span></p>` : ""}
        <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:${C.faint};">N&uacute;mero de gu&iacute;a</p>
        <p style="margin:0;font-family:'Courier New',monospace;font-size:22px;letter-spacing:.08em;color:${C.ink};">${guide}</p>
      </div>` : ""}
    </div>
    ${itemRows ? `
    <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:${C.faint};text-align:center;">Lo que va en tu caja</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 28px;">${itemRows}</table>` : ""}
    ${trackUrl
      ? button(trackUrl, `Rastrear con ${carrierLabel || "la transportadora"}`)
      : button(`${appUrl()}/pedido/${order.id}`, "Rastrear mi pedido")}
    ${trackUrl ? `<p style="margin:12px 0 0;text-align:center;font-family:Arial,sans-serif;font-size:12px;color:${C.faint};">Tambi&eacute;n puedes seguirlo desde <a href="${appUrl()}/pedido/${order.id}" style="color:${C.accent};">tu pedido</a>.</p>` : ""}
    ${hr}
    <div style="text-align:center;">
      <p style="margin:0 0 14px;font-family:Georgia,serif;font-size:15px;line-height:1.7;color:${C.sub};">Mientras llega, &iquest;ya pensaste qu&eacute; aroma sigue?<br/>Un espacio, un aroma — cada rinc&oacute;n cuenta su historia.</p>
      <a href="${appUrl()}/catalogo" style="font-family:Georgia,serif;font-size:14px;color:${C.accent};text-decoration:underline;">Descubrir m&aacute;s aromas &rarr;</a>
    </div>`

  try {
    await transport.sendMail({
      from: FROM,
      to,
      subject: `Tu pedido #${orderId} va en camino 🚚`,
      html: shell(content, "Te avisaremos cualquier novedad del env&iacute;o."),    })
  } catch (err) { console.error("[mailer] Shipped email failed:", err) }
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. Carrito abandonado — motivo: lista ligera + invitación suave.
// ═════════════════════════════════════════════════════════════════════════════
export async function sendAbandonedCartEmail(
  to: string,
  items: Array<{ name: string; price: number; image_url?: string; product_id?: string }>,
  /** Link directo para retomar el pago (init_point de Mercado Pago). Fallback: /checkout. */
  resumeUrl?: string | null
): Promise<void> {
  const transport = createTransport()
  if (!transport) { console.warn("[mailer] SMTP not configured — skipping abandoned cart email"); return }

  const imgs = await imagesByProductId(items)
  const list = items.slice(0, 4).map((item) => `
    <tr>
      ${thumbCell(item.image_url ? absUrl(item.image_url) : (item.product_id ? imgs[item.product_id] : undefined), item.name)}
      <td style="padding:10px 0;border-bottom:1px solid ${C.line};font-family:Georgia,serif;font-size:14px;color:${C.ink};">${item.name}</td>
      <td align="right" style="padding:10px 0;border-bottom:1px solid ${C.line};font-family:Georgia,serif;font-size:14px;color:${C.sub};">${fmtCOP(item.price)}</td>
    </tr>`).join("")

  const content = `
    <div style="text-align:center;">
      ${kicker("Tu carrito")}
      ${title("Lo dejamos guardado<br/>para ti.")}
      ${para("Estos aromas siguen esperando en tu carrito, tal como los dejaste:", 6)}
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0 30px;">${list}</table>
    ${button(resumeUrl || `${appUrl()}/checkout`, "Terminar mi compra")}
    <p style="margin:22px 0 0;text-align:center;font-family:Arial,sans-serif;font-size:12px;color:${C.faint};">Si ya no te interesa, simplemente ignora este correo.</p>`

  try {
    await transport.sendMail({
      from: FROM,
      to,
      subject: "Tu carrito te espera — Cliché Aromas",
      html: shell(content, "Guardamos tu selecci&oacute;n por tiempo limitado."),    })
  } catch (err) { console.error("[mailer] Abandoned cart email failed:", err) }
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. Solicitud de reseña — motivo: estrellas terracota.
// ═════════════════════════════════════════════════════════════════════════════
/**
 * Resuelve la URL donde el cliente puede dejar su reseña: la página del PRIMER
 * producto comprado (las reseñas viven como sección #resenas dentro de
 * /productos/[slug] — no existe una página /resenas independiente). Si el item
 * es un kit personalizado ("pack-…" no existe en products), usamos su primer
 * componente. Si nada resuelve, caemos al catálogo: mejor que un enlace roto.
 */
async function reviewUrlForItems(
  items: Array<{ product_id?: string; components?: Array<{ product_id?: string }> }>
): Promise<string> {
  try {
    const candidateIds = items
      .flatMap((it) => [it.product_id, ...(it.components || []).map((c) => c.product_id)])
      .filter((id): id is string => !!id && !id.startsWith("pack-"))
    if (candidateIds.length) {
      const db = createServerClient()
      const { data } = await db.from("products").select("id, slug").in("id", [...new Set(candidateIds)])
      const slugById = new Map((data || []).map((p) => [p.id, p.slug]))
      // Respetar el orden de compra: el primer item que resuelva a un slug gana.
      for (const id of candidateIds) {
        const slug = slugById.get(id)
        if (slug) return `${appUrl()}/productos/${slug}#resenas`
      }
    }
  } catch { /* enlace de respaldo abajo */ }
  return `${appUrl()}/catalogo`
}

export async function sendReviewRequestEmail(
  to: string,
  name: string,
  items: Array<{ product_id?: string; components?: Array<{ product_id?: string }> }>
): Promise<void> {
  const transport = createTransport()
  if (!transport) { console.warn("[mailer] SMTP not configured — skipping review request"); return }

  const reviewUrl = await reviewUrlForItems(items || [])

  const content = `
    <div style="text-align:center;">
      ${kicker("Tu opini&oacute;n")}
      <p style="margin:0 0 18px;font-size:22px;letter-spacing:.35em;color:${C.accent};">&#9733;&#9733;&#9733;&#9733;&#9733;</p>
      ${title(`${name}, &iquest;c&oacute;mo huele<br/>tu casa ahora?`)}
      ${para("Nos encantar&iacute;a saber c&oacute;mo te fue con tu aroma. Tu experiencia gu&iacute;a a otros hogares — y a nosotros nos ayuda a mejorar. Toma 30 segundos.", 30)}
      ${button(reviewUrl, "Contar mi experiencia")}
    </div>`

  try {
    await transport.sendMail({
      from: FROM,
      to,
      subject: `${name}, ¿cómo te fue con tu Cliché?`,
      html: shell(content, "Gracias por hacer parte de Clich&eacute;."),    })
  } catch (err) { console.error("[mailer] Review request failed:", err) }
}

// ═════════════════════════════════════════════════════════════════════════════
// 6.5 Alerta de PAGO FALLIDO → admin — motivo: rescatar la venta llamando al
// cliente. Nació de la auditoría 2026-08-03: 4 clientes reales intentaron pagar
// y quedaron invisibles (MP no registró ni un intento y nadie se enteró).
// ═════════════════════════════════════════════════════════════════════════════
export async function sendPaymentFailedAlert(order: {
  reference: string
  total: number
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
}): Promise<void> {
  const transport = createTransport()
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER
  if (!transport || !adminEmail) {
    console.warn("[mailer] Payment-failed alert skipped — SMTP or ADMIN_EMAIL not configured")
    return
  }

  const orderId = order.reference.slice(-8).toUpperCase()
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:9px 0;border-bottom:1px solid ${C.line};font-family:Arial,sans-serif;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${C.faint};white-space:nowrap;padding-right:18px;">${label}</td>
      <td align="right" style="padding:9px 0;border-bottom:1px solid ${C.line};font-family:Georgia,serif;font-size:14px;color:${C.ink};">${value}</td>
    </tr>`

  const content = `
    <div style="text-align:center;">
      ${kicker("Pago fallido — cliente por rescatar")}
      <p style="margin:0 0 4px;font-family:Georgia,serif;font-size:34px;color:${C.ink};">${fmtCOP(order.total)}</p>
      <p style="margin:0 0 6px;font-family:'Courier New',monospace;font-size:13px;color:${C.faint};">#${orderId}</p>
    </div>
    ${hr}
    <p style="margin:0 0 18px;font-family:Georgia,serif;font-size:14px;line-height:1.6;color:${C.sub};text-align:center;">
      Este cliente llen&oacute; todos sus datos e intent&oacute; pagar, pero Mercado Pago no proces&oacute; el pago.
      Una llamada o un WhatsApp a tiempo suele recuperar la venta.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row("Cliente", order.customer_name ?? "—")}
      ${row("Email", order.customer_email ?? "—")}
      ${row("Celular", order.customer_phone ?? "—")}
    </table>
    <div style="height:30px;"></div>
    ${order.customer_phone ? button(`https://wa.me/57${order.customer_phone.replace(/\D/g, "").replace(/^57/, "")}`, "Escribirle por WhatsApp") : button(`${appUrl()}/admin-cliche-secret`, "Abrir el panel")}`

  try {
    await transport.sendMail({
      from: FROM,
      to: adminEmail,
      subject: `⚠️ Pago fallido #${orderId} — ${fmtCOP(order.total)} — ${order.customer_name ?? order.customer_email ?? "Cliente"} (llámalo)`,
      html: shell(content, "Generado al volver el cliente de Mercado Pago con el pago fallido."),    })
    console.log("[mailer] Payment-failed alert sent for", orderId)
  } catch (err) {
    console.error("[mailer] Payment-failed alert failed:", err)
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. Alerta de pedido nuevo → admin — motivo: ficha operativa compacta.
// ═════════════════════════════════════════════════════════════════════════════
export async function sendAdminOrderAlert(order: {
  reference: string
  total: number
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  shipping_address: { address: string; city: string; department: string; notes?: string | null } | null
  items: Array<{ name?: string; product_id: string; quantity: number; price?: number }>
}): Promise<void> {
  const transport = createTransport()
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER
  if (!transport || !adminEmail) {
    console.warn("[mailer] Admin alert skipped — SMTP or ADMIN_EMAIL not configured")
    return
  }

  const orderId = order.reference.slice(-8).toUpperCase()
  const addr = order.shipping_address
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:9px 0;border-bottom:1px solid ${C.line};font-family:Arial,sans-serif;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${C.faint};white-space:nowrap;padding-right:18px;">${label}</td>
      <td align="right" style="padding:9px 0;border-bottom:1px solid ${C.line};font-family:Georgia,serif;font-size:14px;color:${C.ink};">${value}</td>
    </tr>`

  const imgs = await imagesByProductId(order.items)
  const itemsRows = order.items.map((it) => `
    <tr>
      ${thumbCell(imgs[it.product_id], it.name ?? "Producto")}
      <td style="padding:10px 0;border-bottom:1px solid ${C.line};font-family:Georgia,serif;font-size:14px;color:${C.ink};">${it.name ?? it.product_id}&nbsp;<span style="color:${C.faint};font-size:12px;">&times;${it.quantity}</span></td>
      <td align="right" style="padding:10px 0;border-bottom:1px solid ${C.line};font-family:Georgia,serif;font-size:14px;color:${C.sub};">${it.price ? fmtCOP(it.price * it.quantity) : "—"}</td>
    </tr>`).join("")

  const content = `
    <div style="text-align:center;">
      ${kicker("Nuevo pedido pagado")}
      <p style="margin:0 0 4px;font-family:Georgia,serif;font-size:34px;color:${C.ink};">${fmtCOP(order.total)}</p>
      <p style="margin:0 0 6px;font-family:'Courier New',monospace;font-size:13px;color:${C.faint};">#${orderId}</p>
    </div>
    ${hr}
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row("Cliente", order.customer_name ?? "—")}
      ${row("Email", order.customer_email ?? "—")}
      ${row("Celular", order.customer_phone ?? "—")}
      ${addr ? row("Direcci&oacute;n", `${addr.address}, ${addr.city}, ${addr.department}`) : row("Direcci&oacute;n", "⚠️ Sin direcci&oacute;n registrada")}
      ${addr?.notes ? row("Nota", addr.notes) : ""}
    </table>
    <p style="margin:26px 0 2px;font-family:Arial,sans-serif;font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:${C.faint};text-align:center;">Productos comprados</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${itemsRows}
    </table>
    <div style="height:30px;"></div>
    ${button(`${appUrl()}/admin-cliche-secret`, "Abrir el panel")}`

  try {
    await transport.sendMail({
      from: FROM,
      to: adminEmail,
      subject: `🛍️ Nuevo pedido #${orderId} — ${fmtCOP(order.total)} — ${order.customer_name ?? order.customer_email ?? "Cliente"}`,
      html: shell(content, "Generado autom&aacute;ticamente al confirmarse el pago en Mercado Pago."),    })
    console.log("[mailer] Admin order alert sent for", orderId)
  } catch (err) {
    console.error("[mailer] Admin alert failed:", err)
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 8. Alerta de inventario → admin — motivo: el dueño debe enterarse en el acto
//    cuando un producto se agota (stock 0) o se sobrevendió (pagos concurrentes
//    de la última unidad), sin tener que entrar al panel.
// ═════════════════════════════════════════════════════════════════════════════
export async function sendStockAlertEmail(alert: {
  reference: string
  outOfStock: Array<{ name: string; product_id: string }>
  oversold: Array<{ name: string; product_id: string; qty: number }>
}): Promise<void> {
  const transport = createTransport()
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER
  if (!transport || !adminEmail) {
    console.warn("[mailer] Stock alert skipped — SMTP or ADMIN_EMAIL not configured")
    return
  }
  if (alert.outOfStock.length === 0 && alert.oversold.length === 0) return

  const orderId = alert.reference.slice(-8).toUpperCase()
  const li = (text: string) => `
    <tr>
      <td style="padding:9px 0;border-bottom:1px solid ${C.line};font-family:Georgia,serif;font-size:14px;color:${C.ink};">${text}</td>
    </tr>`

  const outRows = alert.outOfStock.map((p) => li(`${p.name} — <strong>agotado (0 unidades)</strong>`)).join("")
  const overRows = alert.oversold.map((p) => li(`${p.name} — ⚠️ se vendieron ${p.qty} unidad(es) SIN stock suficiente (revisar inventario real)`)).join("")

  const content = `
    <div style="text-align:center;">
      ${kicker("Alerta de inventario")}
      <p style="margin:0 0 4px;font-family:Georgia,serif;font-size:26px;color:${C.ink};">Productos por reponer</p>
      <p style="margin:0 0 6px;font-family:'Courier New',monospace;font-size:13px;color:${C.faint};">Pedido #${orderId}</p>
    </div>
    ${hr}
    <p style="margin:0 0 18px;font-family:Georgia,serif;font-size:14px;line-height:1.6;color:${C.sub};text-align:center;">
      Con la venta del pedido #${orderId} estos productos quedaron sin unidades disponibles.
      Mientras est&eacute;n en 0 no se pueden comprar en la tienda.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${outRows}
      ${overRows}
    </table>
    <div style="height:30px;"></div>
    ${button(`${appUrl()}/admin-cliche-secret`, "Reponer stock en el panel")}`

  try {
    await transport.sendMail({
      from: FROM,
      to: adminEmail,
      subject: `📦 Stock agotado — ${[...alert.outOfStock, ...alert.oversold].map((p) => p.name).join(", ").slice(0, 80)}`,
      html: shell(content, "Generado autom&aacute;ticamente al descontar inventario de un pedido pagado."),
    })
    console.log("[mailer] Stock alert sent for", orderId)
  } catch (err) {
    console.error("[mailer] Stock alert failed:", err)
  }
}
