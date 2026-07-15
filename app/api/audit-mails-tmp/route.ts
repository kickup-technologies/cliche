import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import {
  sendAdminOtpEmail,
  sendWelcomeEmail,
  sendOrderConfirmation,
  sendOrderShippedEmail,
  sendAbandonedCartEmail,
  sendReviewRequestEmail,
  sendAdminOrderAlert,
} from "@/lib/mailer"

/**
 * ENDPOINT TEMPORAL DE AUDITORÍA — BORRAR TRAS USAR.
 * Envía los 7 tipos de correo con datos de ejemplo a un destinatario FIJO.
 * Protegido por secreto de un solo uso. No es un vector de spam a terceros.
 */
const SECRET = "7c27ae57fab44c3b855aeb1306740808"
const TO = "pipebonillaesc25@gmail.com"

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("key") !== SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const results: Record<string, string> = {}
  const run = async (name: string, fn: () => Promise<unknown>) => {
    try { await fn(); results[name] = "enviado" }
    catch (e) { results[name] = "ERROR: " + (e instanceof Error ? e.message : String(e)) }
  }

  const db = createServerClient()
  const { data: prods } = await db
    .from("products")
    .select("id, name, price, image_url")
    .eq("is_active", true)
    .limit(3)
  const p = prods && prods.length ? prods : [
    { id: "demo-1", name: "Aroma Agua", price: 78000, image_url: "/images/products/agua.webp" },
    { id: "demo-2", name: "Aroma Mahai", price: 78000, image_url: "/images/products/mahai.webp" },
  ]

  const shippingAddress = {
    address: "Calle 10 #43-21, Barrio Poblado",
    city: "Medellín",
    department: "Antioquia",
    notes: "Dejar en portería",
  }
  const orderItems = p.slice(0, 2).map((x) => ({
    product_id: x.id, quantity: 1, name: x.name, price: Number(x.price) || 78000,
  }))
  const subtotal = orderItems.reduce((s, it) => s + it.price * it.quantity, 0)

  await run("1_codigo_seguridad", () => sendAdminOtpEmail(TO, "482913"))
  await run("2_bienvenida", () => sendWelcomeEmail(TO, "BIENVENIDA10"))
  await run("3_confirmacion_compra", () => sendOrderConfirmation(TO, {
    id: "cliche_auditoria_demo01",
    total: subtotal - Math.round(subtotal * 0.1) + 20500,
    items: orderItems,
    customerName: "Felipe Bonilla",
    shippingAddress,
    discountCode: "BIENVENIDA10",
    discountAmount: Math.round(subtotal * 0.1),
  }))
  await run("4_pedido_enviado", () => sendOrderShippedEmail(TO, {
    id: "cliche_auditoria_demo01",
    customerName: "Felipe Bonilla",
    trackingNumber: "COL-9988776655",
    items: orderItems.map((it) => ({ product_id: it.product_id, name: it.name, quantity: it.quantity })),
  }))
  await run("5_carrito_abandonado", () => sendAbandonedCartEmail(TO,
    p.slice(0, 2).map((x) => ({ name: x.name, price: Number(x.price) || 78000, image_url: x.image_url, product_id: x.id }))
  ))
  await run("6_solicitud_resena", () => sendReviewRequestEmail(TO, "Felipe",
    orderItems.map((it) => ({ product_id: it.product_id }))
  ))
  const prevAdmin = process.env.ADMIN_EMAIL
  process.env.ADMIN_EMAIL = TO
  await run("7_alerta_admin_pedido", () => sendAdminOrderAlert({
    reference: "cliche_auditoria_demo01",
    total: subtotal + 20500,
    customer_name: "Felipe Bonilla",
    customer_email: "cliente.demo@gmail.com",
    customer_phone: "3194565463",
    shipping_address: shippingAddress,
    items: orderItems,
  }))
  process.env.ADMIN_EMAIL = prevAdmin

  return NextResponse.json({ destinatario: TO, resultados: results })
}
