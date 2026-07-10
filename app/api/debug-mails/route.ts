import { NextRequest, NextResponse } from "next/server"
import {
  sendOrderConfirmation,
  sendOrderShippedEmail,
  sendAbandonedCartEmail,
  sendReviewRequestEmail,
  sendWelcomeEmail,
  sendAdminOrderAlert,
} from "@/lib/mailer"

// ⚠️ TEMPORAL — previsualización de plantillas de correo. BORRAR tras aprobar
// los diseños. Protegido con token y con destinatario FIJO (no sirve de relay).
export const dynamic = "force-dynamic"

const TO = "pipebonillaesc25@gmail.com"

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("t") !== "cliche_mail_9k2f") {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }
  const type = req.nextUrl.searchParams.get("type") || "confirmacion"

  // IDs reales del catálogo para que las previews muestren las fotos
  const items = [
    { product_id: "0d90e707-173d-4fa3-b679-c8acddfde79d", name: "Aroma Índigo Profundo", quantity: 1, price: 78000 },
    { product_id: "f7754e2b-e112-4eaf-b224-36c49ca77199", name: "Aroma Dulce Lana", quantity: 2, price: 78000 },
  ]

  try {
    switch (type) {
      case "confirmacion":
        await sendOrderConfirmation(TO, { id: "cliche_demo_A1B2C3D4", total: 234000, items })
        break
      case "enviado":
        await sendOrderShippedEmail(TO, { id: "cliche_demo_A1B2C3D4", customerName: "Andrés Bonilla", trackingNumber: "COORD-123456789", items })
        break
      case "carrito":
        await sendAbandonedCartEmail(TO, items.map((i) => ({ name: i.name, price: i.price })))
        break
      case "resena":
        await sendReviewRequestEmail(TO, "Andrés", [])
        break
      case "bienvenida":
        await sendWelcomeEmail(TO, "BIENVENIDA10")
        break
      case "alerta":
        // La alerta va a ADMIN_EMAIL; para la PREVIEW la redirigimos al
        // destinatario fijo de pruebas (no molestar el buzón real de la admin).
        process.env.ADMIN_EMAIL = TO
        await sendAdminOrderAlert({
          reference: "cliche_demo_A1B2C3D4",
          total: 234000,
          customer_name: "Andrés Bonilla",
          customer_email: "cliente@ejemplo.com",
          customer_phone: "+57 300 123 4567",
          shipping_address: { address: "Cra 15 # 85-24, Apto 501", city: "Bogotá", department: "Cundinamarca", notes: "Portería: dejar con el vigilante" },
          items,
        })
        break
      default:
        return NextResponse.json({ error: "type inválido: confirmacion | enviado | carrito | resena | bienvenida" }, { status: 400 })
    }
    return NextResponse.json({ ok: true, sent: type, to: TO })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
