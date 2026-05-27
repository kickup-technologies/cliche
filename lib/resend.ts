import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

// Sender — change to your verified domain once set up in Resend dashboard
const FROM = process.env.RESEND_FROM ?? "Cliche Aromas <onboarding@resend.dev>"

export async function sendWelcomeEmail(to: string, discountCode: string) {
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Bienvenido a Cliché Aromas</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F5;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF8F5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 40px rgba(0,0,0,0.07);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#2D1A14 0%,#6B3D30 100%);padding:48px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.25em;text-transform:uppercase;color:rgba(255,255,255,0.5);">Bienvenida a</p>
              <h1 style="margin:0;font-family:'Georgia',serif;font-size:42px;font-weight:700;color:#ffffff;letter-spacing:0.05em;">Cliché</h1>
              <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.6);letter-spacing:0.1em;text-transform:uppercase;">Aromas que transforman tu espacio</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:48px 40px;">
              <p style="margin:0 0 16px;font-size:22px;font-weight:600;color:#2D1A14;">Gracias por ser parte de la familia 🤎</p>
              <p style="margin:0 0 28px;font-size:16px;line-height:1.7;color:#6B5A53;">
                Ya eres parte de más de <strong>5.000 hogares colombianos</strong> que transformaron su espacio con Cliché. 
                Como regalo de bienvenida, aquí está tu código exclusivo:
              </p>

              <!-- Code box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="background:#FAF0EC;border:2px dashed #C4958A;border-radius:16px;padding:28px;text-align:center;">
                    <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#8B6E64;">Tu código de descuento</p>
                    <p style="margin:0 0 8px;font-family:'Courier New',monospace;font-size:36px;font-weight:900;letter-spacing:0.15em;color:#2D1A14;">${discountCode}</p>
                    <p style="margin:0;font-size:13px;color:#C4958A;font-weight:600;">Aplica en tu primera compra</p>
                  </td>
                </tr>
              </table>

              <!-- Benefits -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
                <tr>
                  <td width="50%" style="padding:0 8px 12px 0;vertical-align:top;">
                    <p style="margin:0;font-size:14px;color:#2D1A14;"><strong>🚚 Envío gratis</strong></p>
                    <p style="margin:4px 0 0;font-size:13px;color:#8B6E64;">en compras mayores a $300.000</p>
                  </td>
                  <td width="50%" style="padding:0 0 12px 8px;vertical-align:top;">
                    <p style="margin:0;font-size:14px;color:#2D1A14;"><strong>🛡️ Garantía 30 días</strong></p>
                    <p style="margin:4px 0 0;font-size:13px;color:#8B6E64;">si no te encanta, te devolvemos</p>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding:0 8px 0 0;vertical-align:top;">
                    <p style="margin:0;font-size:14px;color:#2D1A14;"><strong>🌿 100% Natural</strong></p>
                    <p style="margin:4px 0 0;font-size:13px;color:#8B6E64;">sin químicos, no mancha</p>
                  </td>
                  <td width="50%" style="padding:0 0 0 8px;vertical-align:top;">
                    <p style="margin:0;font-size:14px;color:#2D1A14;"><strong>🇨🇴 Hecho en Colombia</strong></p>
                    <p style="margin:4px 0 0;font-size:13px;color:#8B6E64;">artesanal, con amor</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://cliche-nine.vercel.app/catalogo" style="display:inline-block;background:#2D1A14;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:100px;font-size:15px;font-weight:700;letter-spacing:0.05em;">
                      Ver catálogo →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#FAF8F5;padding:24px 40px;text-align:center;border-top:1px solid #EDD5CF;">
              <p style="margin:0 0 4px;font-size:12px;color:#8B6E64;">Cliché Aromas · Colombia</p>
              <p style="margin:0;font-size:11px;color:#B0A09A;">Recibiste este correo porque te suscribiste en nuestro sitio.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Tu código ${discountCode} está listo 🎁 — Cliché Aromas`,
      html,
    })
  } catch (err) {
    // Non-blocking — subscription still saved even if email fails
    console.error("[resend] Failed to send welcome email:", err)
  }
}
