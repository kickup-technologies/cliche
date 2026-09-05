import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { isAdmin } from "@/lib/admin-auth"

/**
 * GET /api/admin/data
 * Fetches all admin data using service role (bypasses RLS).
 * Protegido por la cookie firmada del panel admin (isAdmin). Devuelve datos
 * personales de clientes, así que SIN auth no responde.
 */
// PostgREST devuelve máximo 1.000 filas por consulta; se pagina con .range()
// hasta agotar los registros del año para que ningún mes quede sin visitas.
async function fetchAllPageViews(
  supabase: ReturnType<typeof createServerClient>,
  since: string
): Promise<{ data: Array<{ path: string; created_at: string }> }> {
  const PAGE = 1000
  const all: Array<{ path: string; created_at: string }> = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("page_views")
      .select("path, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1)
    if (error) {
      console.error("[admin/data] page_views error:", error)
      break
    }
    all.push(...(data || []))
    if (!data || data.length < PAGE) break
  }
  return { data: all }
}

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
        // Solo pedidos REALMENTE pagados: los "pending" se crean al iniciar el
        // checkout (antes de pagar en Mercado Pago) y solo el webhook de pago
        // aprobado los confirma. El admin nunca debe verlos como pedidos.
        .neq("status", "pending")
        .gte("created_at", oneYearAgo)
        .order("created_at", { ascending: false }),
      supabase
        .from("products")
        .select("*")
        .order("created_at"),
      supabase
        .from("site_settings")
        .select("*"),
      // page_views supera el tope de 1.000 filas por consulta de PostgREST:
      // sin paginar, solo llegaban las filas más viejas y los meses recientes
      // aparecían con 0 visitas en el panel. Se trae completo por páginas.
      fetchAllPageViews(supabase, oneYearAgo),
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
