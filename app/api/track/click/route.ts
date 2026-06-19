import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { rateLimit } from "@/lib/rate-limit"

/**
 * POST /api/track/click — registra un clic real del visitante.
 *
 * Construye el mapa de calor PROPIO (en tiempo real), sin depender de Clarity
 * (que tiene 1–2 días de retraso). Igual que /api/track, usa el cliente anónimo
 * porque la tabla click_events tiene la policy RLS `anon_insert_click_events`
 * (WITH CHECK true). No necesita SUPABASE_SERVICE_ROLE_KEY.
 *
 * Cuerpo: { path, label, xr (0..1), yr (0..1), vw, vh }
 */
export async function POST(req: NextRequest) {
  // Anti-flood del mapa de calor: tope alto por IP (clics reales caben de sobra)
  const limited = rateLimit(req, { id: "track-click", limit: 300, windowMs: 60_000 })
  if (limited) return limited
  try {
    const b = await req.json().catch(() => ({}))
    const clamp01 = (n: unknown) => {
      const x = Number(n)
      return Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0
    }
    const row = {
      path: typeof b.path === "string" && b.path ? b.path.slice(0, 512) : "/",
      label: typeof b.label === "string" ? b.label.slice(0, 80) : "",
      xr: clamp01(b.xr),
      yr: clamp01(b.yr),
      vw: Number.isFinite(Number(b.vw)) ? Math.round(Number(b.vw)) : null,
      vh: Number.isFinite(Number(b.vh)) ? Math.round(Number(b.vh)) : null,
    }

    const { error } = await supabase.from("click_events").insert(row)
    if (error) {
      console.error("[track/click] insert falló:", error.message)
      return NextResponse.json({ ok: false, error: error.message }, { status: 200 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[track/click] error:", err)
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
