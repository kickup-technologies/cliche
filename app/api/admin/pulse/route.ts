import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { isAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

/**
 * GET /api/admin/pulse — latido diminuto (~100 B) para el refresco EN VIVO
 * del panel: cuántos pedidos hay y cuándo llegó el último. El panel lo
 * consulta cada pocos segundos y solo cuando cambia dispara la recarga
 * completa (/api/admin/data) — así una compra aparece sola en segundos sin
 * pagar el payload grande en cada tick.
 */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const supabase = createServerClient()
  const { count, data, error } = await supabase
    .from("orders")
    .select("created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(1)
  if (error) return NextResponse.json({ error: "Error" }, { status: 500 })
  return NextResponse.json({ n: count || 0, last: data?.[0]?.created_at || null })
}
