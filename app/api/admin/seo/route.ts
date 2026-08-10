import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { createServerClient } from "@/lib/supabase"
import { isAdmin } from "@/lib/admin-auth"
import { SEO_MAX_TITLE, SEO_MAX_DESCRIPTION, type SeoRow } from "@/lib/seo"

/** Solo se acepta SEO para rutas del propio sitio (nada de rutas inventadas). */
function isValidPath(path: unknown): path is string {
  if (typeof path !== "string") return false
  return /^\/$|^\/(catalogo|ofertas|arma-tu-kit)$|^\/productos\/[a-z0-9-]{1,120}$/.test(path)
}

/** GET /api/admin/seo — todos los overrides guardados. */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  try {
    const db = createServerClient()
    const { data, error } = await db
      .from("seo_settings")
      .select("path, title, description, updated_at")
      .order("path")
    if (error) throw error
    return NextResponse.json({ rows: (data || []) as SeoRow[] })
  } catch (err) {
    console.error("[admin/seo GET]", err)
    return NextResponse.json({ error: "No se pudo cargar el SEO" }, { status: 500 })
  }
}

/**
 * POST /api/admin/seo — guarda (upsert) el SEO de una ruta.
 * Body: { path, title, description }
 * Si título y descripción quedan vacíos, se borra la fila y la página vuelve
 * a su SEO por defecto (el del código).
 */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const body = await req.json()
    const { path } = body as { path?: unknown }
    if (!isValidPath(path)) {
      return NextResponse.json({ error: "Ruta inválida" }, { status: 400 })
    }

    const title = String((body as { title?: unknown }).title ?? "").trim()
    const description = String((body as { description?: unknown }).description ?? "").trim()

    // Tope generoso: Google recorta antes, pero no tiene sentido guardar
    // párrafos enteros en el <title>.
    if (title.length > SEO_MAX_TITLE * 2 || description.length > SEO_MAX_DESCRIPTION * 2) {
      return NextResponse.json({ error: "Texto demasiado largo" }, { status: 400 })
    }

    const db = createServerClient()

    if (!title && !description) {
      const { error } = await db.from("seo_settings").delete().eq("path", path)
      if (error) throw error
    } else {
      const { error } = await db.from("seo_settings").upsert(
        { path, title: title || null, description: description || null, updated_at: new Date().toISOString() },
        { onConflict: "path" },
      )
      if (error) throw error
    }

    // Que el cambio se vea sin esperar los 5 min de ISR.
    try {
      revalidatePath(path)
    } catch {
      /* revalidar es un extra: si falla, el cambio igual entra en la próxima regeneración */
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[admin/seo POST]", err)
    return NextResponse.json({ error: "No se pudo guardar el SEO" }, { status: 500 })
  }
}
