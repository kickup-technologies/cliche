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
                  <a href="https://cliche-nine.vercel.app/catalogo"
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
