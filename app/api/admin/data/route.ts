import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

/**
 * GET /api/admin/data
 * Fetches all admin data using service role (bypasses RLS).
 * Protected by ADMIN_PASSWORD check via the session token in the request header.
 * Called by the admin panel client instead of querying Supabase directly with anon key.
 */
export async function GET() {
  try {
    const supabase = createServerClient() // service role — bypasses RLS
    const oneYearAgo = new Date(Date.now() - 365 * 86400000).toISOString()

    const [
      { data: orders, error: ordersErr },
      { data: products, error: productsErr },
      { data: settings },
      { data: pageViews },
    ] = await Promise.all([
      supabase
        .from("orders")
        .select("*")
        .gte("created_at", oneYearAgo)
        .order("created_at", { ascending: false }),
      supabase
        .from("products")
        .select("*")
        .order("created_at"),
      supabase
        .from("site_settings")
        .select("*"),
      supabase
        .from("page_views")
        .select("path, created_at")
        .gte("created_at", oneYearAgo),
    ])

    if (ordersErr) console.error("[admin/data] orders error:", ordersErr)
    if (productsErr) console.error("[admin/data] products error:", productsErr)

    return NextResponse.json({
      orders: orders || [],
      products: products || [],
      settings: settings || [],
      pageViews: pageViews || [],
    })
  } catch (err) {
    console.error("[admin/data]", err)
    return NextResponse.json({ error: "Error loading data" }, { status: 500 })
  }
}
