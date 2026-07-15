import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { createServerClient } from "@/lib/supabase"
import { isAdmin } from "@/lib/admin-auth"

// Campos que el admin puede escribir (whitelist — nunca confiar en todo el body)
export const PRODUCT_FIELDS = [
  "name", "slug", "price", "original_price", "description", "image_url",
  "image_urls", "category", "badge", "badge_color", "stock", "rating", "reviews", "is_active",
] as const

export function pickProductFields(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const k of PRODUCT_FIELDS) if (k in body) out[k] = body[k]
  return out
}

/**
 * Purga la caché estática de las páginas que muestran productos para que un
 * alta/edición/borrado se REFLEJE de inmediato (sin esperar el revalidate de
 * 5 min de /productos/[slug] ni el caché del catálogo). Si se da el slug,
 * también revalida esa ficha concreta.
 */
export function revalidateProductPages(slug?: string | null) {
  try {
    revalidatePath("/")
    revalidatePath("/catalogo")
    revalidatePath("/ofertas")
    if (slug) revalidatePath(`/productos/${slug}`)
  } catch (e) {
    console.error("[products] revalidate falló:", e)
  }
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const db = createServerClient()
    const { data, error } = await db
      .from("products")
      .select("id, name, price, stock, image_url")
      .order("name", { ascending: true })

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error("[admin/products GET] error:", err)
    return NextResponse.json({ error: "Error al obtener productos" }, { status: 500 })
  }
}

// POST — crear producto
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const body = await req.json()
    const fields = pickProductFields(body)
    if (!fields.name || !fields.slug || !fields.price) {
      return NextResponse.json({ error: "Nombre, slug y precio son requeridos" }, { status: 400 })
    }

    const db = createServerClient()
    const { data, error } = await db.from("products").insert(fields).select().single()
    if (error) throw error
    revalidateProductPages(data?.slug)
    return NextResponse.json(data)
  } catch (err) {
    console.error("[admin/products POST]", err)
    return NextResponse.json({ error: "Error al crear el producto" }, { status: 500 })
  }
}
