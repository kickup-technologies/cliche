import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { isAdmin } from "@/lib/admin-auth"

/**
 * GET /api/admin/data
 * Fetches all admin data using service role (bypasses RLS).
 * Protegido por la cookie firmada del panel admin (isAdmin). Devuelve datos
 * personales de clientes, así que SIN auth no responde.
 */
// PostgREST devuelve máximo 1.000 filas por consulta. Antes se paginaba EN
// SERIE (una ida y vuelta por cada 1.000 filas → el panel tardaba varios
// segundos en abrir). Ahora la PRIMERA página trae el COUNT en la misma
// consulta (una ida y vuelta menos) y las restantes van EN PARALELO.
/**
 * Visitas SUMADAS POR LA BASE: una fila por (día, página) con su cuenta en `n`,
 * vía la función visitas_por_dia. El tamaño ya no depende del tráfico —con mil
 * visitas o con diez millones pesa lo mismo— y el número es exacto.
 *
 * Devuelve null si la función no existe o falla, y entonces se usa el método
 * anterior (filas sueltas). Cada fila se sella a MEDIANOCHE de Bogotá (05:00
 * UTC): los filtros del panel exigen created_at < ahora, y un sello de
 * mediodía haría desaparecer las visitas de hoy hasta pasadas las 12.
 */
async function fetchAggregatedPageViews(
  supabase: ReturnType<typeof createServerClient>,
  since: string
): Promise<{ data: Array<{ path: string; created_at: string; n: number }> } | null> {
  const PAGE = 1000
  type Fila = { dia: string; path: string; visitas: number }
  const pagina = (desde: number, conTotal: boolean) =>
    supabase.rpc("visitas_por_dia", { desde: since }, conTotal ? { count: "exact" } : undefined).range(desde, desde + PAGE - 1)
  const first = await pagina(0, true)
  if (first.error) return null
  const filas: Fila[] = [...((first.data as Fila[]) || [])]
  const total = first.count || filas.length
  const pages = Math.ceil(total / PAGE)
  if (pages > 1) {
    const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => pagina((i + 1) * PAGE, false)))
    for (const r of rest) if (!r.error) filas.push(...((r.data as Fila[]) || []))
  }
  return {
    data: filas.map(f => ({ path: f.path, created_at: `${f.dia}T05:00:00.000Z`, n: Number(f.visitas) || 0 })),
  }
}

async function fetchAllPageViews(
  supabase: ReturnType<typeof createServerClient>,
  since: string
): Promise<{ data: Array<{ path: string; created_at: string; n?: number }> }> {
  // Primero la suma en la base; solo si no está disponible se descargan las
  // visitas sueltas como antes.
  const agregado = await fetchAggregatedPageViews(supabase, since).catch(() => null)
  if (agregado) return agregado
  const PAGE = 1000
  const base = () =>
    supabase
      .from("page_views")
      .select("path, created_at", { count: "exact" })
      .gte("created_at", since)
      .order("created_at", { ascending: false })
  const first = await base().range(0, PAGE - 1)
  if (first.error) {
    console.error("[admin/data] page_views error:", first.error)
    return { data: [] }
  }
  const all: Array<{ path: string; created_at: string }> = [...(first.data || [])]
  const total = first.count || all.length
  const pages = Math.ceil(total / PAGE)
  if (pages > 1) {
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) => base().range((i + 1) * PAGE, (i + 2) * PAGE - 1))
    )
    for (const r of rest) {
      if (r.error) { console.error("[admin/data] page_views error:", r.error); continue }
      all.push(...(r.data || []))
    }
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
