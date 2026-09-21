import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { createServerClient } from "@/lib/supabase"
import { isAdmin } from "@/lib/admin-auth"
import { getHeroOverrides } from "@/lib/editorial-hero-server"
import { parseHeroOverrides, DEFAULT_SLIDES } from "@/lib/editorial-hero"

/**
 * Hero de la portada, editable desde la sección Portada del panel (editor
 * 1:1). Se guarda como UNA fila JSON en site_settings (key `editorial_hero`:
 * overrides por diapositiva sobre las de fábrica); al guardar se revalida "/"
 * y el cambio se publica al instante.
 */

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  return NextResponse.json({ overrides: await getHeroOverrides(), defaults: DEFAULT_SLIDES })
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  let body: unknown = null
  try { body = await req.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }
  const overrides = parseHeroOverrides(body)
  try {
    const db = createServerClient()
    const { error } = await db.from("site_settings").upsert(
      [{ key: "editorial_hero", value: JSON.stringify(overrides), updated_at: new Date().toISOString() }],
      { onConflict: "key" },
    )
    if (error) throw error
    revalidatePath("/")
    return NextResponse.json({ ok: true, overrides })
  } catch (err) {
    console.error("[admin/hero POST]", err)
    return NextResponse.json({ error: "No se pudo guardar la portada" }, { status: 500 })
  }
}
