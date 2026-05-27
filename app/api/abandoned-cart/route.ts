import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { sendAbandonedCartEmail } from "@/lib/mailer"

// Called by a cron job or timer after ~1 hour of inactivity
// POST body: { session_id, email }
export async function POST(req: NextRequest) {
  try {
    const { session_id, email } = await req.json()

    if (!session_id || !email) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 })
    }

    const supabase = createServerClient()

    // Get cart items for this session
    const { data: cartItems } = await supabase
      .from("cart_items")
      .select("quantity, product:products(name, price, image_url)")
      .eq("session_id", session_id)

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({ message: "Carrito vacío, sin email" })
    }

    // Check if this session already placed an order (don't spam buyers)
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("id")
      .eq("customer_email", email)
      .gte("created_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .single()

    if (existingOrder) {
      return NextResponse.json({ message: "Ya hay un pedido reciente, sin email" })
    }

    // Build items list for email
    const items = cartItems.flatMap((ci) => {
      const p = ci.product as { name: string; price: number; image_url?: string } | null
      if (!p) return []
      return Array.from({ length: ci.quantity }, () => ({
        name: p.name,
        price: p.price,
        image_url: p.image_url,
      }))
    })

    await sendAbandonedCartEmail(email, items)

    return NextResponse.json({ sent: true })
  } catch (error) {
    console.error("Abandoned cart error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
