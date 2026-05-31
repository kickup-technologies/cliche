import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { sendReviewRequestEmail } from "@/lib/mailer"

/**
 * GET /api/cron/review-emails  — disparado por Vercel Cron (diario).
 *
 * Pide reseña a clientes cuyo pedido fue confirmado hace 7+ días
 * (tiempo razonable para que ya recibieran y probaran el producto).
 *
 * Protegido por CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get("authorization")
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
  }

  try {
    const supabase = createServerClient()
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // Pedidos entregados/confirmados hace 7–30 días, sin email de reseña aún
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, customer_email, customer_name, items")
      .in("status", ["confirmed", "shipped", "delivered"])
      .eq("review_email_sent", false)
      .not("customer_email", "is", null)
      .lte("created_at", sevenDaysAgo)
      .gte("created_at", thirtyDaysAgo)

    if (error) {
      console.error("[review-emails] query error:", error)
      return NextResponse.json({ error: "Error de consulta" }, { status: 500 })
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ processed: 0, message: "Sin reseñas pendientes" })
    }

    let sent = 0
    for (const order of orders) {
      const firstName = (order.customer_name as string)?.split(" ")[0] || "Cliente"
      try {
        await sendReviewRequestEmail(order.customer_email as string, firstName, (order.items as unknown[]) || [])
        await supabase
          .from("orders")
          .update({ review_email_sent: true })
          .eq("id", order.id)
        sent++
      } catch (e) {
        console.error("[review-emails] send failed for", order.id, e)
      }
    }

    return NextResponse.json({ processed: orders.length, sent })
  } catch (error) {
    console.error("[review-emails] error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
