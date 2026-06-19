import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { rateLimit } from "@/lib/rate-limit"

/**
 * POST /api/track — registra una vista de página.
 *
 * Usa el cliente ANÓNIMO a propósito: la tabla page_views tiene una policy RLS
 * `anon_insert_page_views` (WITH CHECK true), así que NO necesita la
 * SUPABASE_SERVICE_ROLE_KEY. Antes usaba service-role y si esa clave estaba
 * mal configurada en producción el insert fallaba en silencio y el dashboard
 * de tráfico se quedaba en cero. Con el cliente anónimo el tracking funciona
 * mientras la URL + anon key (públicas) estén bien.
 */
export async function POST(req: NextRequest) {
  // Anti-flood de analítica: tope generoso por IP (navegación normal cabe de sobra)
  const limited = rateLimit(req, { id: "track-view", limit: 120, windowMs: 60_000 })
  if (limited) return limited
  try {
    const { path } = await req.json()
    const safePath = typeof path === "string" && path ? path.slice(0, 512) : "/"

    const { error } = await supabase.from("page_views").insert({ path: safePath })
    if (error) {
      console.error("[track] insert page_view falló:", error.message)
      return NextResponse.json({ ok: false, error: error.message }, { status: 200 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[track] error:", err)
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
