import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { isAdmin } from "@/lib/admin-auth"
import { pickProductFields, revalidateProductPages } from "../route"
import { productSeoPath } from "@/lib/seo"
import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * El SEO personalizado de una ficha se guarda por RUTA (`/productos/<slug>`),
 * así que tiene que seguir al producto cuando cambia de slug y desaparecer
 * cuando el producto se borra. Si esto falla, el producto igual se guarda: el
 * SEO es un extra, nunca puede tumbar la edición.
 */
async function moveProductSeo(db: SupabaseClient, fromSlug: string, toSlug: string) {
  try {
    const to = productSeoPath(toSlug)
    // La ruta destino podría tener ya su propia fila: la de la ruta vieja manda.
    await db.from("seo_settings").delete().eq("path", to)
    await db.from("seo_settings").update({ path: to }).eq("path", productSeoPath(fromSlug))
  } catch (e) {
    console.error("[admin/products] no se pudo mover el SEO del producto:", e)
  }
}

/**
 * PUT /api/admin/products/[id]  — actualiza cualquier campo permitido del
 * producto (edición completa, stock, activar/ocultar). Reemplaza las
 * escrituras directas con el cliente anónimo.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params

  try {
    const body = await req.json()
    const fields = pickProductFields(body)
    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 })
    }
    if ("stock" in fields && Number(fields.stock) < 0) {
      return NextResponse.json({ error: "Stock inválido" }, { status: 400 })
    }
    fields.updated_at = new Date().toISOString()

    const db = createServerClient()

    // Si se está cambiando el slug hay que saber el anterior ANTES de escribir:
    // la ficha vieja queda cacheada y su SEO guardado apunta a la ruta vieja.
    let previousSlug: string | null = null
    if ("slug" in fields) {
      const { data: before } = await db.from("products").select("slug").eq("id", id).single()
      previousSlug = before?.slug ?? null
    }

    const { data, error } = await db
      .from("products")
      .update(fields)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    if (previousSlug && data?.slug && previousSlug !== data.slug) {
      await moveProductSeo(db, previousSlug, data.slug)
      revalidateProductPages(previousSlug)
    }
    // Refleja el cambio de inmediato en la ficha del producto + catálogo/home.
    revalidateProductPages(data?.slug)
    return NextResponse.json(data)
  } catch (err) {
    console.error("[admin/products PUT]", err)
    return NextResponse.json({ error: "Error al actualizar el producto" }, { status: 500 })
  }
}

// DELETE — eliminar producto
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params

  try {
    const db = createServerClient()
    // Leemos el slug ANTES de borrar para poder revalidar su ficha.
    const { data: existing } = await db.from("products").select("slug").eq("id", id).single()
    const { error } = await db.from("products").delete().eq("id", id)
    if (error) throw error
    // La ficha ya no existe: su SEO personalizado tampoco debe quedar vivo.
    if (existing?.slug) {
      try {
        await db.from("seo_settings").delete().eq("path", productSeoPath(existing.slug))
      } catch (e) {
        console.error("[admin/products] no se pudo borrar el SEO del producto:", e)
      }
    }
    revalidateProductPages(existing?.slug)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[admin/products DELETE]", err)
    return NextResponse.json({ error: "Error al eliminar el producto" }, { status: 500 })
  }
}
