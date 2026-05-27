/**
 * lib/mailer.ts — SMTP email sender (nodemailer)
 *
 * Env vars needed in Vercel / .env.local when the company email is ready:
 *   SMTP_HOST     e.g. mail.clichearomas.com  (or smtp.gmail.com)
 *   SMTP_PORT     587  (TLS) or 465 (SSL)
 *   SMTP_SECURE   false  (true only for port 465)
 *   SMTP_USER     hola@clichearomas.com
 *   SMTP_PASS     your-email-password-or-app-password
 *   SMTP_FROM     Cliche Aromas <hola@clichearomas.com>
 *
 * While env vars are missing the function logs a warning and returns — no crash.
 */

import nodemailer from "nodemailer"

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

const FROM = process.env.SMTP_FROM ?? "Cliche Aromas <hola@clichearomas.com>"

export async function sendWelcomeEmail(to: string, discountCode: string): Promise<void> {
  const transport = createTransport()

  if (!transport) {
    console.warn("[mailer] SMTP not configured — skipping welcome email for", to)
    return
  }

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Bienvenido a Cliche Aromas</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F5;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF8F5;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 40px rgba(0,0,0,.07);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#2D1A14 0%,#6B3D30 100%);padding:48px 40px;text-align:center;">
            <p style="margin:0 0 8px;font-size:11px;letter-spacing:.25em;text-transform:uppercase;color:rgba(255,255,255,.5);">Bienvenida a</p>
            <h1 style="margin:0;font-family:Georgia,serif;font-size:42px;font-weight:700;color:#fff;letter-spacing:.05em;">Cliche</h1>
            <p style="margin:8px 0 0;font-size:12px;color:rgba(255,255,255,.55);letter-spacing:.12em;text-transform:uppercase;">Aromas que transforman tu espacio</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:48px 40px;">
            <p style="margin:0 0 12px;font-size:22px;font-weight:600;color:#2D1A14;">Gracias por ser parte de la familia</p>
            <p style="margin:0 0 28px;font-size:15px;line-height:1.75;color:#6B5A53;">
              Ya eres parte de mas de <strong>5.000 hogares colombianos</strong> que transformaron su espacio.
              Como regalo de bienvenida, aqui esta tu codigo exclusivo de descuento:
            </p>

            <!-- Code -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr>
                <td style="background:#FAF0EC;border:2px dashed #C4958A;border-radius:16px;padding:28px;text-align:center;">
                  <p style="margin:0 0 8px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#8B6E64;">Tu codigo de descuento</p>
                  <p style="margin:0 0 8px;font-family:'Courier New',monospace;font-size:34px;font-weight:900;letter-spacing:.15em;color:#2D1A14;">${discountCode}</p>
                  <p style="margin:0;font-size:13px;color:#C4958A;font-weight:600;">Aplica en tu primera compra</p>
                </td>
              </tr>
            </table>

            <!-- Benefits -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
              <tr>
                <td width="50%" style="padding:0 10px 14px 0;vertical-align:top;">
                  <p style="margin:0 0 3px;font-size:14px;color:#2D1A14;font-weight:600;">Envio gratis</p>
                  <p style="margin:0;font-size:13px;color:#8B6E64;">en compras mayores a $300.000</p>
                </td>
                <td width="50%" style="padding:0 0 14px 10px;vertical-align:top;">
                  <p style="margin:0 0 3px;font-size:14px;color:#2D1A14;font-weight:600;">Garantia 30 dias</p>
                  <p style="margin:0;font-size:13px;color:#8B6E64;">si no te encanta, te devolvemos</p>
                </td>
              </tr>
              <tr>
                <td width="50%" style="padding:0 10px 0 0;vertical-align:top;">
                  <p style="margin:0 0 3px;font-size:14px;color:#2D1A14;font-weight:600;">100% Natural</p>
                  <p style="margin:0;font-size:13px;color:#8B6E64;">sin quimicos, no mancha</p>
                </td>
                <td width="50%" style="padding:0 0 0 10px;vertical-align:top;">
                  <p style="margin:0 0 3px;font-size:14px;color:#2D1A14;font-weight:600;">Hecho en Colombia</p>
                  <p style="margin:0;font-size:13px;color:#8B6E64;">artesanal, con amor</p>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://clichearomas.com"}/catalogo"
                     style="display:inline-block;background:#2D1A14;color:#fff;text-decoration:none;padding:16px 44px;border-radius:100px;font-size:15px;font-weight:700;letter-spacing:.05em;">
                    Ver catalogo
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#FAF8F5;padding:22px 40px;text-align:center;border-top:1px solid #EDD5CF;">
            <p style="margin:0 0 4px;font-size:12px;color:#8B6E64;">Cliche Aromas - Colombia</p>
            <p style="margin:0;font-size:11px;color:#B0A09A;">Recibiste este correo porque te suscribiste en nuestro sitio.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  try {
    await transport.sendMail({
      from: FROM,
      to,
      subject: `Tu codigo ${discountCode} esta listo — Cliche Aromas`,
      html,
    })
    console.log("[mailer] Welcome email sent to", to)
  } catch (err) {
    console.error("[mailer] Failed to send welcome email:", err)
  }
}

// ── Order confirmation ────────────────────────────────────────────────────────
export async function sendOrderConfirmation(
  to: string,
  order: { id: string; total: number; items: Array<{ product_id: string; quantity: number }> }
): Promise<void> {
  const transport = createTransport()
  if (!transport) { console.warn("[mailer] SMTP not configured — skipping order confirmation"); return }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://clichearomas.com"
  const orderId = order.id.slice(-8).toUpperCase()
  // total is stored in pesos (integer), NOT centavos — do NOT divide by 100
  const totalFormatted = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(order.total)

  const html = `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#FAF8F5;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF8F5;padding:40px 16px;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 40px rgba(0,0,0,.07);">
  <tr><td style="background:linear-gradient(135deg,#2D1A14 0%,#6B3D30 100%);padding:40px;text-align:center;">
    <h1 style="margin:0;font-family:Georgia,serif;font-size:36px;font-weight:700;color:#fff;">Cliche</h1>
    <p style="margin:8px 0 0;font-size:12px;color:rgba(255,255,255,.55);letter-spacing:.12em;text-transform:uppercase;">Confirmacion de pedido</p>
  </td></tr>
  <tr><td style="padding:40px;">
    <p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#2D1A14;">Tu pedido fue confirmado</p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#6B5A53;">Estamos preparando tu aroma con mucho cuidado. Te notificaremos cuando sea despachado.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF8F5;border-radius:16px;padding:20px;margin-bottom:28px;">
      <tr><td style="font-size:13px;color:#8B6E64;">Numero de pedido</td><td align="right" style="font-family:'Courier New',monospace;font-weight:700;color:#2D1A14;font-size:16px;">#${orderId}</td></tr>
      <tr><td colspan="2" style="padding:8px 0;"><hr style="border:none;border-top:1px solid #EDD5CF;"/></td></tr>
      <tr><td style="font-size:13px;color:#8B6E64;">Total pagado</td><td align="right" style="font-size:18px;font-weight:700;color:#2D1A14;">${totalFormatted}</td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <a href="${appUrl}/pedido/${order.id}" style="display:inline-block;background:#2D1A14;color:#fff;text-decoration:none;padding:14px 40px;border-radius:100px;font-size:14px;font-weight:700;">
        Seguir mi pedido
      </a>
    </td></tr></table>
  </td></tr>
  <tr><td style="background:#FAF8F5;padding:20px 40px;text-align:center;border-top:1px solid #EDD5CF;">
    <p style="margin:0;font-size:11px;color:#B0A09A;">Cliche Aromas - Colombia | hola@clichearomas.com</p>
  </td></tr>
</table></td></tr></table>
</body></html>`

  try {
    await transport.sendMail({ from: FROM, to, subject: `Pedido #${orderId} confirmado — Cliche Aromas`, html })
  } catch (err) { console.error("[mailer] Order confirmation failed:", err) }
}

// ── Abandoned cart ───────────────────────────────────────────────────────────
export async function sendAbandonedCartEmail(
  to: string,
  items: Array<{ name: string; price: number; image_url?: string }>
): Promise<void> {
  const transport = createTransport()
  if (!transport) { console.warn("[mailer] SMTP not configured — skipping abandoned cart email"); return }

  const itemsList = items.slice(0, 4).map((item) =>
    `<tr><td style="padding:8px 0;font-size:14px;color:#2D1A14;">${item.name}</td><td align="right" style="padding:8px 0;font-size:14px;font-weight:600;color:#2D1A14;">$${item.price.toLocaleString("es-CO")} COP</td></tr>`
  ).join("")

  const html = `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#FAF8F5;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF8F5;padding:40px 16px;"><tr><td align="center">
<table width="540" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 40px rgba(0,0,0,.07);">
  <tr><td style="background:linear-gradient(135deg,#2D1A14 0%,#6B3D30 100%);padding:40px;text-align:center;">
    <h1 style="margin:0;font-family:Georgia,serif;font-size:36px;font-weight:700;color:#fff;">Cliche</h1>
    <p style="margin:8px 0 0;font-size:12px;color:rgba(255,255,255,.55);letter-spacing:.12em;text-transform:uppercase;">Tu carrito te espera</p>
  </td></tr>
  <tr><td style="padding:40px;">
    <p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#2D1A14;">Olvidaste algo especial</p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#6B5A53;">Guardamos tu carrito para que puedas retomar tu compra cuando quieras.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;border-top:1px solid #EDD5CF;">
      ${itemsList}
    </table>
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://clichearomas.com"}/" style="display:inline-block;background:#2D1A14;color:#fff;text-decoration:none;padding:16px 44px;border-radius:100px;font-size:15px;font-weight:700;">
        Completar mi compra
      </a>
    </td></tr></table>
  </td></tr>
  <tr><td style="background:#FAF8F5;padding:20px 40px;text-align:center;border-top:1px solid #EDD5CF;">
    <p style="margin:0;font-size:11px;color:#B0A09A;">Cliche Aromas - Colombia | hola@clichearomas.com</p>
  </td></tr>
</table></td></tr></table>
</body></html>`

  try {
    await transport.sendMail({ from: FROM, to, subject: "Tu carrito te espera — Cliche Aromas", html })
  } catch (err) { console.error("[mailer] Abandoned cart email failed:", err) }
}

// ── Review request (sent post-purchase) ──────────────────────────────────────
export async function sendReviewRequestEmail(
  to: string,
  name: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _items: unknown[]
): Promise<void> {
  const transport = createTransport()
  if (!transport) { console.warn("[mailer] SMTP not configured — skipping review request"); return }

  const html = `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#FAF8F5;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF8F5;padding:40px 16px;"><tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 40px rgba(0,0,0,.07);">
  <tr><td style="background:linear-gradient(135deg,#2D1A14 0%,#6B3D30 100%);padding:36px;text-align:center;">
    <h1 style="margin:0;font-family:Georgia,serif;font-size:32px;font-weight:700;color:#fff;">Cliche</h1>
  </td></tr>
  <tr><td style="padding:40px;text-align:center;">
    <p style="font-size:40px;margin:0 0 16px;">&#11088;</p>
    <p style="margin:0 0 12px;font-size:20px;font-weight:600;color:#2D1A14;">Hola ${name}, como te fue?</p>
    <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#6B5A53;">Tu opinion ayuda a mas hogares colombianos a encontrar su aroma perfecto. Solo toma 30 segundos.</p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://clichearomas.com"}/resenas" style="display:inline-block;background:#C4958A;color:#fff;text-decoration:none;padding:14px 36px;border-radius:100px;font-size:14px;font-weight:700;margin-bottom:16px;">
      Dejar mi resena
    </a>
  </td></tr>
  <tr><td style="background:#FAF8F5;padding:20px 40px;text-align:center;border-top:1px solid #EDD5CF;">
    <p style="margin:0;font-size:11px;color:#B0A09A;">Cliche Aromas - Colombia</p>
  </td></tr>
</table></td></tr></table>
</body></html>`

  try {
    await transport.sendMail({ from: FROM, to, subject: `${name}, como te fue con tu Cliche? Cuentanos`, html })
  } catch (err) { console.error("[mailer] Review request failed:", err) }
}

// ── Admin order alert ─────────────────────────────────────────────────────────
// Notifica al administrador cuando se confirma un nuevo pedido.
// Requiere: ADMIN_EMAIL en variables de entorno (puede ser el mismo SMTP_USER)
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://clichearomas.com"
  const orderId = order.reference.slice(-8).toUpperCase()
  const totalFormatted = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(order.total)

  const itemsRows = order.items.map((item) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #EDD5CF;font-size:14px;color:#2D1A14;">${item.name ?? item.product_id}</td>
      <td style="padding:8px 0;border-bottom:1px solid #EDD5CF;font-size:14px;color:#2D1A14;text-align:center;">× ${item.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #EDD5CF;font-size:14px;color:#2D1A14;text-align:right;">${item.price ? new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",minimumFractionDigits:0}).format(item.price * item.quantity) : "—"}</td>
    </tr>`).join("")

  const addr = order.shipping_address
  const addressBlock = addr
    ? `<p style="margin:4px 0;font-size:14px;color:#2D1A14;">${addr.address}</p>
       <p style="margin:4px 0;font-size:14px;color:#2D1A14;">${addr.city}, ${addr.department}</p>
       ${addr.notes ? `<p style="margin:4px 0;font-size:13px;color:#8B6E64;font-style:italic;">Nota: ${addr.notes}</p>` : ""}`
    : `<p style="margin:4px 0;font-size:13px;color:#C4958A;">⚠️ Sin dirección registrada</p>`

  const html = `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#FAF8F5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF8F5;padding:32px 16px;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

  <!-- Header urgente -->
  <tr><td style="background:#2D1A14;padding:28px 32px;text-align:center;">
    <p style="margin:0 0 4px;font-size:11px;letter-spacing:.2em;color:rgba(255,255,255,.5);text-transform:uppercase;">Cliche Aromas — Panel Admin</p>
    <h1 style="margin:0;font-size:24px;font-weight:700;color:#fff;">🛍️ Nuevo pedido confirmado</h1>
    <p style="margin:8px 0 0;font-size:20px;font-weight:700;color:#C4958A;">${totalFormatted}</p>
  </td></tr>

  <tr><td style="padding:32px;">

    <!-- Referencia -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF8F5;border-radius:12px;padding:16px;margin-bottom:24px;">
      <tr>
        <td style="font-size:12px;color:#8B6E64;text-transform:uppercase;letter-spacing:.1em;">Pedido #</td>
        <td align="right" style="font-family:monospace;font-size:18px;font-weight:700;color:#2D1A14;">${orderId}</td>
      </tr>
    </table>

    <!-- Cliente -->
    <h2 style="margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:.1em;color:#8B6E64;">👤 Cliente</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td style="font-size:14px;color:#2D1A14;padding:3px 0;"><strong>Nombre:</strong> ${order.customer_name ?? "—"}</td></tr>
      <tr><td style="font-size:14px;color:#2D1A14;padding:3px 0;"><strong>Email:</strong> ${order.customer_email ?? "—"}</td></tr>
      <tr><td style="font-size:14px;color:#2D1A14;padding:3px 0;"><strong>Celular:</strong> ${order.customer_phone ?? "—"}</td></tr>
    </table>

    <!-- Dirección de envío -->
    <h2 style="margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:.1em;color:#8B6E64;">📦 Dirección de envío</h2>
    <div style="background:#FFF8F5;border:2px solid #EDD5CF;border-radius:12px;padding:16px;margin-bottom:24px;">
      ${addressBlock}
    </div>

    <!-- Productos -->
    <h2 style="margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:.1em;color:#8B6E64;">🛒 Productos</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <thead><tr>
        <th style="text-align:left;font-size:12px;color:#8B6E64;padding-bottom:8px;border-bottom:2px solid #EDD5CF;">Producto</th>
        <th style="text-align:center;font-size:12px;color:#8B6E64;padding-bottom:8px;border-bottom:2px solid #EDD5CF;">Cant.</th>
        <th style="text-align:right;font-size:12px;color:#8B6E64;padding-bottom:8px;border-bottom:2px solid #EDD5CF;">Total</th>
      </tr></thead>
      <tbody>${itemsRows}</tbody>
      <tfoot><tr>
        <td colspan="2" style="padding:12px 0 0;font-size:15px;font-weight:700;color:#2D1A14;">TOTAL COBRADO</td>
        <td style="padding:12px 0 0;font-size:18px;font-weight:700;color:#A67163;text-align:right;">${totalFormatted}</td>
      </tr></tfoot>
    </table>

    <!-- CTA Admin -->
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <a href="${appUrl}/admin" style="display:inline-block;background:#2D1A14;color:#fff;text-decoration:none;padding:14px 36px;border-radius:100px;font-size:14px;font-weight:700;letter-spacing:.05em;">
        Ver en panel admin →
      </a>
    </td></tr></table>

  </td></tr>

  <tr><td style="background:#FAF8F5;padding:16px 32px;text-align:center;border-top:1px solid #EDD5CF;">
    <p style="margin:0;font-size:11px;color:#B0A09A;">Este correo se genera automáticamente cuando se confirma un pago en Wompi.</p>
  </td></tr>

</table></td></tr></table>
</body></html>`

  try {
    await transport.sendMail({
      from: FROM,
      to: adminEmail,
      subject: `🛍️ Nuevo pedido #${orderId} — ${totalFormatted} — ${order.customer_name ?? order.customer_email ?? "Cliente"}`,
      html,
    })
    console.log("[mailer] Admin order alert sent for", orderId)
  } catch (err) {
    console.error("[mailer] Admin alert failed:", err)
  }
}
