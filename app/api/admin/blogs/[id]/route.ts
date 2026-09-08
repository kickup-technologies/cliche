import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { isAdmin } from "@/lib/admin-auth"
import { pickBlogFields, revalidateBlogPages } from "../route"

// PUT /api/admin/blogs/[id] — actualiza cualquier campo permitido del artículo
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params

  try {
    const body = await req.json()
    const fields = pickBlogFields(body)
    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 })
    }
    fields.updated_at = new Date().toISOString()

    const db = createServerClient()

    // Estado anterior: si cambia el slug hay que revalidar también la ruta
    // vieja (queda cacheada), y published_at solo se fija al publicar por
    // primera vez.
    const { data: before } = await db
      .from("blog_posts")
      .select("slug, published, published_at")
      .eq("id", id)
      .single()
    if (fields.published === true && !before?.published_at) {
      fields.published_at = new Date().toISOString()
    }

    const { data, error } = await db
      .from("blog_posts")
      .update(fields)
      .eq("id", id)
      .select()
      .single()

    if (error?.code === "23505") {
      return NextResponse.json(
        { error: "Ya existe otro artículo con ese enlace. Cambia un poco el título." },
        { status: 409 },
      )
    }
    if (error) throw error

    if (before?.slug && data?.slug && before.slug !== data.slug) {
      revalidateBlogPages(before.slug)
    }
    revalidateBlogPages(data?.slug)
    return NextResponse.json(data)
  } catch (err) {
    console.error("[admin/blogs PUT]", err)
    return NextResponse.json({ error: "Error al actualizar el artículo" }, { status: 500 })
  }
}

// DELETE — eliminar artículo
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params

  try {
    const db = createServerClient()
    const { data: existing } = await db.from("blog_posts").select("slug").eq("id", id).single()
    const { error } = await db.from("blog_posts").delete().eq("id", id)
    if (error) throw error
    revalidateBlogPages(existing?.slug)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[admin/blogs DELETE]", err)
    return NextResponse.json({ error: "Error al eliminar el artículo" }, { status: 500 })
  }
}
