import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { isAdmin } from "@/lib/admin-auth"

/**
 * GET /api/admin/data
 * Fetches all admin data using service role (bypasses RLS).
 * Protegido por la credencial x-admin-password (header). Devuelve datos
 * personales de clientes, así que SIN auth no responde.
 */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

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

    // Si TODAS las consultas devuelven vacío y al menos una falló, casi siempre
    // significa que falta SUPABASE_SERVICE_ROLE_KEY en el entorno (el cliente
    // service-role no puede leer nada). Devolvemos el error en vez de fingir
    // que la base de datos está vacía, para no confundir "sin clave" con "sin datos".
    if (productsErr || ordersErr) {
      return NextResponse.json(
        {
          error:
            "No se pudieron cargar los datos. Verifica que SUPABASE_SERVICE_ROLE_KEY esté configurada en el entorno.",
          detail: (productsErr || ordersErr)?.message ?? null,
        },
        { status: 500 }
      )
    }

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
