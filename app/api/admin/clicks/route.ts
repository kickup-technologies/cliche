import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { isAdmin } from "@/lib/admin-auth"

/**
 * GET /api/admin/clicks?path=/&days=30
 *
 * Devuelve los clics registrados (mapa de calor propio, en tiempo real) para
 * graficar zonas calientes sobre una maqueta de la página dentro del admin.
 * No depende de Clarity. Protegido por isAdmin.
 */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const days = Math.min(Math.max(Number(req.nextUrl.searchParams.get("days") ?? 30), 1), 365)
  const pathFilter = req.nextUrl.searchParams.get("path") // opcional
  const since = new Date(Date.now() - days * 86400000).toISOString()

  try {
    const sb = createServerClient()
    let q = sb
      .from("click_events")
      .select("path,label,xr,yr,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000)
    if (pathFilter) q = q.eq("path", pathFilter)

    const { data, error } = await q
    if (error) {
      return NextResponse.json({ ok: false, error: error.message, clicks: [] }, { status: 200 })
    }

    const clicks = data ?? []

    // Conteo de clics por path (para el selector de página)
    const byPath: Record<string, number> = {}
    for (const c of clicks) byPath[c.path] = (byPath[c.path] || 0) + 1

    return NextResponse.json({ ok: true, total: clicks.length, byPath, clicks }, { status: 200 })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err).slice(0, 200), clicks: [] },
      { status: 200 }
    )
  }
}
