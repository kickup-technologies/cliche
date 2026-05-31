import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { isAdmin } from "@/lib/admin-auth"

/**
 * POST /api/admin/settings  — guarda (upsert) los ajustes de la tienda.
 * Body: { settings: Record<string, string> }
 * Reemplaza la escritura directa con el cliente anónimo.
 */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const { settings } = await req.json()
    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ error: "Settings inválidos" }, { status: 400 })
    }

    const rows = Object.entries(settings as Record<string, string>).map(([key, value]) => ({
      key,
      value: String(value ?? ""),
      updated_at: new Date().toISOString(),
    }))

    const db = createServerClient()
    const { error } = await db.from("site_settings").upsert(rows, { onConflict: "key" })
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[admin/settings POST]", err)
    return NextResponse.json({ error: "Error al guardar la configuración" }, { status: 500 })
  }
}
