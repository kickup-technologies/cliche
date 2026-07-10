import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { isAdmin } from "@/lib/admin-auth"
import { sendOrderShippedEmail } from "@/lib/mailer"

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const supabase = createServerClient()
  // Por defecto: solo pedidos REALMENTE pagados (los "pending" se crean antes
  // de pagar y solo el webhook los confirma). Con ?vista=intentos se devuelven
  // ÚNICAMENTE esos intentos sin pagar, para la vista secundaria del panel.
  const vista = req.nextUrl.searchParams.get("vista")
  let query = supabase
    .from("orders")
    .select("id, status, total, tracking_number, customer_name, customer_email, customer_phone, customer_id_number, shipping_address, discount_code, discount_amount, stripe_session_id, created_at, items")
    .order("created_at", { ascending: false })
    .limit(200)
  query = vista === "intentos" ? query.eq("status", "pending") : query.neq("status", "pending")
  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

/**
 * PATCH /api/admin/orders  — actualiza estado y/o número de guía de un pedido.
 * Reemplaza la escritura directa con el cliente anónimo (que era insegura).
 */
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const { id, status, tracking_number } = await req.json()
    if (!id) return NextResponse.json({ error: "Falta el id del pedido" }, { status: 400 })

    const ALLOWED_STATUS = ["pending", "confirmed", "preparing", "shipped", "delivered", "paid", "cancelled"]
    const update: Record<string, unknown> = {}
    if (status !== undefined) {
      if (!ALLOWED_STATUS.includes(status)) {
        return NextResponse.json({ error: "Estado inválido" }, { status: 400 })
      }
      update.status = status
    }
    if (tracking_number !== undefined) {
      update.tracking_number = String(tracking_number).trim() || null
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 })
    }

    const supabase = createServerClient()
    // Estado previo: para enviar el correo de "en camino" SOLO cuando el pedido
    // pasa a "shipped" por primera vez (no en re-guardados del mismo estado).
    const { data: before } = await supabase.from("orders").select("status").eq("id", id).single()

    const { data, error } = await supabase
      .from("orders")
      .update(update)
      .eq("id", id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Correo automático al cliente: "tu pedido va en camino" (con guía si la hay)
    if (update.status === "shipped" && before?.status !== "shipped" && data?.customer_email) {
      await sendOrderShippedEmail(data.customer_email, {
        id: data.stripe_session_id || data.id,
        customerName: data.customer_name,
        trackingNumber: data.tracking_number,
      }).catch((e: unknown) => console.error("[admin/orders] shipped email:", e))
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error("[admin/orders PATCH]", err)
    return NextResponse.json({ error: "Error al actualizar el pedido" }, { status: 500 })
  }
}
