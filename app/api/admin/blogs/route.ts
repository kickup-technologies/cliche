import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import DOMPurify from "isomorphic-dompurify"
import { createServerClient } from "@/lib/supabase"
import { isAdmin } from "@/lib/admin-auth"

// Campos que el admin puede escribir (whitelist — nunca confiar en todo el body)
export const BLOG_FIELDS = [
  "title", "slug", "excerpt", "cover_url", "content", "author", "published",
] as const

export function pickBlogFields(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const k of BLOG_FIELDS) if (k in body) out[k] = body[k]
  // El contenido llega como HTML del editor: se sanitiza SIEMPRE en el servidor
  // porque el sitio lo renderiza con dangerouslySetInnerHTML.
  if (typeof out.content === "string") {
    out.content = DOMPurify.sanitize(out.content, {
      ALLOWED_ATTR: ["href", "src", "alt", "title", "style", "class", "target", "rel", "width", "height"],
      ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|\/(?!\/))/i,
    })
  }
  return out
}

/**
 * Purga la caché estática de las páginas del blog para que guardar un artículo
 * lo PUBLIQUE de inmediato (mismo mecanismo que revalidateProductPages).
 */
export function revalidateBlogPages(slug?: string | null) {
  try {
    revalidatePath("/blog")
    if (slug) revalidatePath(`/blog/${slug}`)
    revalidatePath("/sitemap.xml")
  } catch (e) {
    console.error("[blogs] revalidate falló:", e)
  }
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const db = createServerClient()
    const { data, error } = await db
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error("[admin/blogs GET] error:", err)
    return NextResponse.json({ error: "Error al obtener los artículos" }, { status: 500 })
  }
}

// POST — crear artículo (guardar = publicar, salvo que venga published: false)
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const body = await req.json()
    const fields = pickBlogFields(body)
    if (!fields.title || !fields.slug) {
      return NextResponse.json({ error: "El título es requerido" }, { status: 400 })
    }
    if (fields.published !== false) fields.published = true
    if (fields.published) fields.published_at = new Date().toISOString()

    const db = createServerClient()
    const { data, error } = await db.from("blog_posts").insert(fields).select().single()
    if (error?.code === "23505") {
      return NextResponse.json(
        { error: "Ya existe un artículo con ese título. Cámbialo un poco." },
        { status: 409 },
      )
    }
    if (error) throw error
    revalidateBlogPages(data?.slug)
    return NextResponse.json(data)
  } catch (err) {
    console.error("[admin/blogs POST]", err)
    return NextResponse.json({ error: "Error al crear el artículo" }, { status: 500 })
  }
}
