import { Resend } from "resend"

// Lazy — no se instancia en build time
let _resend: Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!)
  return _resend
}

function getFrom() {
  return `${process.env.RESEND_FROM_NAME || "Cliché Aromas"} <${process.env.RESEND_FROM_EMAIL || "noreply@example.com"}>`
}

// Email de bienvenida con código de descuento
export async function sendWelcomeEmail(email: string, discountCode: string) {
  return getResend().emails.send({
    from: getFrom(),
    to: email,
    subject: "¡Tu código de 20% OFF te espera! 🌿",
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #FAF8F5;">
        <h1 style="color: #A67163; font-size: 28px; margin-bottom: 8px;">¡Bienvenida a Cliché Aromas! 🌿</h1>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">
          Gracias por unirte. Aquí está tu código de descuento exclusivo:
        </p>
        <div style="background: #A67163; color: white; padding: 20px; border-radius: 12px; text-align: center; margin: 30px 0;">
          <p style="margin: 0; font-size: 14px; letter-spacing: 2px; opacity: 0.8;">TU CÓDIGO</p>
          <p style="margin: 8px 0 0; font-size: 36px; font-weight: bold; letter-spacing: 4px;">${discountCode}</p>
          <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.8;">20% de descuento en tu primera compra</p>
        </div>
        <p style="color: #555; font-size: 14px;">
          Usa este código al momento de pagar. Válido por 30 días.
        </p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}"
           style="display: inline-block; background: #A67163; color: white; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-size: 16px; font-weight: bold; margin-top: 20px;">
          VER PRODUCTOS →
        </a>
        <p style="color: #aaa; font-size: 12px; margin-top: 40px;">
          Si no solicitaste este correo, ignóralo. Sin spam, prometido.
        </p>
      </div>
    `,
  })
}

// Email de carrito abandonado
export async function sendAbandonedCartEmail(
  email: string,
  items: Array<{ name: string; price: number; image_url?: string }>
) {
  const total = items.reduce((acc, i) => acc + i.price, 0)
  const itemsHtml = items
    .map(
      (item) => `
        <tr>
          <td style="padding: 10px 0; color: #333; font-size: 14px;">${item.name}</td>
          <td style="padding: 10px 0; color: #333; text-align: right; font-size: 14px;">
            $${item.price.toLocaleString("es-CO")} COP
          </td>
        </tr>`
    )
    .join("")

  return getResend().emails.send({
    from: getFrom(),
    to: email,
    subject: "🌿 Olvidaste algo en tu carrito...",
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #FAF8F5;">
        <h1 style="color: #A67163; font-size: 24px;">¿Olvidaste algo? 🌿</h1>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">
          Notamos que dejaste estos productos en tu carrito. Están esperando por ti:
        </p>
        <table style="width: 100%; border-top: 1px solid #eee; margin: 20px 0;">
          ${itemsHtml}
          <tr style="border-top: 2px solid #A67163;">
            <td style="padding-top: 12px; font-weight: bold; color: #A67163;">TOTAL</td>
            <td style="padding-top: 12px; font-weight: bold; color: #A67163; text-align: right;">
              $${total.toLocaleString("es-CO")} COP
            </td>
          </tr>
        </table>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}"
           style="display: inline-block; background: #A67163; color: white; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-size: 16px; font-weight: bold; margin-top: 16px;">
          RECUPERAR MI CARRITO →
        </a>
        <p style="color: #aaa; font-size: 12px; margin-top: 40px;">
          Si ya realizaste tu compra, ignora este correo. · Cliché Aromas
        </p>
      </div>
    `,
  })
}

// Email de solicitud de reseña (post-compra, por producto)
export async function sendReviewRequestEmail(
  email: string,
  customerName: string,
  items: Array<{ name: string; slug: string }>
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://clichecolombia.com"

  const itemsHtml = items
    .map(
      (item) => `
        <div style="margin-bottom: 16px; padding: 16px; background: #F5EDE8; border-radius: 12px;">
          <p style="margin: 0 0 8px; font-weight: bold; color: #2D1A14; font-size: 15px;">${item.name}</p>
          <a href="${appUrl}/productos/${item.slug}#resenas"
             style="display: inline-block; background: #A67163; color: white; padding: 10px 24px; border-radius: 50px; text-decoration: none; font-size: 14px; font-weight: bold;">
            Dejar mi reseña y obtener 10% OFF
          </a>
        </div>`
    )
    .join("")

  return getResend().emails.send({
    from: getFrom(),
    to: email,
    subject: `¿Cómo estuvo tu experiencia, ${customerName}? — Obtén 10% OFF`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #FAF8F5;">
        <h1 style="color: #A67163; font-size: 26px; margin-bottom: 8px;">Tu opinión nos importa</h1>
        <p style="color: #7A5C52; font-size: 16px; line-height: 1.7;">
          Hola ${customerName}, tu pedido fue entregado. Queremos saber cómo fue tu experiencia
          con los aromas que elegiste.
        </p>
        <p style="color: #7A5C52; font-size: 15px; margin-bottom: 24px;">
          A cambio de cada reseña que dejes, te enviamos un cupón de <strong style="color: #A67163;">10% de descuento</strong>
          para tu próxima compra.
        </p>
        <div style="margin: 28px 0;">
          ${itemsHtml}
        </div>
        <p style="color: #C4958A; font-size: 12px; margin-top: 40px; border-top: 1px solid #E8D5CB; padding-top: 20px;">
          Cliché · hola@clichecolombia.com · Si no realizaste una compra reciente, ignora este correo.
        </p>
      </div>
    `,
  })
}

// Email de confirmación de orden
export async function sendOrderConfirmation(
  email: string,
  orderData: { id: string; total: number; items: Array<{ name: string; quantity: number; price: number }> }
) {
  const itemsHtml = orderData.items
    .map(
      (item) =>
        `<tr>
          <td style="padding: 8px 0; color: #333;">${item.name} x${item.quantity}</td>
          <td style="padding: 8px 0; color: #333; text-align: right;">$${item.price.toLocaleString("es-CO")}</td>
        </tr>`
    )
    .join("")

  return getResend().emails.send({
    from: getFrom(),
    to: email,
    subject: `✅ Pedido confirmado #${orderData.id.slice(0, 8).toUpperCase()}`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #FAF8F5;">
        <h1 style="color: #A67163;">¡Pedido recibido! ✅</h1>
        <p style="color: #555;">Tu pedido está confirmado. Te avisamos cuando esté en camino.</p>
        <table style="width: 100%; border-top: 1px solid #eee; margin: 24px 0;">
          ${itemsHtml}
          <tr style="border-top: 2px solid #A67163;">
            <td style="padding-top: 12px; font-weight: bold; color: #A67163;">TOTAL</td>
            <td style="padding-top: 12px; font-weight: bold; color: #A67163; text-align: right;">
              $${orderData.total.toLocaleString("es-CO")} COP
            </td>
          </tr>
        </table>
        <p style="color: #aaa; font-size: 12px; margin-top: 40px;">
          Pedido #${orderData.id.slice(0, 8).toUpperCase()} · Cliché Aromas
        </p>
      </div>
    `,
  })
}
