import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { sendAbandonedCartEmail } from "@/lib/mailer"

/**
 * GET /api/abandoned-cart  — disparado por Vercel Cron (cada hora).
 *
 * Un "carrito abandonado" = orden con status='pending' creada hace 1–24h
 * que nunca fue confirmada por Wompi. El email del cliente ya quedó capturado
 * al iniciar el checkout, así que podemos recuperarlo.
 *
 * Protegido por CRON_SECRET: Vercel envía Authorization: Bearer <CRON_SECRET>
 * automáticamente cuando la env var existe.
 */
export async function GET(req: NextRequest) {
  // ── Autenticación de cron ──────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get("authorization")
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
  }

  try {
    const supabase = createServerClient()
    const now = Date.now()
    const oneHourAgo = new Date(now - 1 * 60 * 60 * 1000).toISOString()
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString()

    // Órdenes pendientes (checkout iniciado, no pagado) entre 1h y 24h
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, stripe_session_id, customer_email, items, created_at")
      .eq("status", "pending")
      .eq("abandoned_email_sent", false)
      .not("customer_email", "is", null)
      .lte("created_at", oneHourAgo)
      .gte("created_at", oneDayAgo)

    if (error) {
      console.error("[abandoned-cart] query error:", error)
      return NextResponse.json({ error: "Error de consulta" }, { status: 500 })
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ processed: 0, message: "Sin carritos abandonados" })
    }

    // Enriquecer items (product_id → name/price) en un solo query
    const allIds = [
      ...new Set(
        orders.flatMap((o) =>
          ((o.items as Array<{ product_id: string }>) || []).map((i) => i.product_id)
        )
      ),
    ]
    const { data: products } = await supabase
      .from("products")
      .select("id, name, price, image_url")
      .in("id", allIds)
    const productMap = new Map((products || []).map((p) => [p.id, p]))

    let sent = 0
    for (const order of orders) {
      const rawItems = (order.items as Array<{ product_id: string; quantity: number }>) || []
      const items: Array<{ name: string; price: number; image_url?: string }> = []
      for (const it of rawItems) {
        const p = productMap.get(it.product_id)
        if (p) items.push({ name: p.name, price: p.price, image_url: p.image_url || undefined })
      }

      if (items.length === 0) continue

      try {
        await sendAbandonedCartEmail(order.customer_email as string, items)
        await supabase
          .from("orders")
          .update({ abandoned_email_sent: true })
          .eq("id", order.id)
        sent++
      } catch (e) {
        console.error("[abandoned-cart] send failed for", order.id, e)
      }
    }

    return NextResponse.json({ processed: orders.length, sent })
  } catch (error) {
    console.error("[abandoned-cart] error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
