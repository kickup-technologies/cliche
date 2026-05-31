import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { isAdmin } from "@/lib/admin-auth"
import { pickProductFields } from "../route"

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
    const { data, error } = await db
      .from("products")
      .update(fields)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
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
    const { error } = await db.from("products").delete().eq("id", id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[admin/products DELETE]", err)
    return NextResponse.json({ error: "Error al eliminar el producto" }, { status: 500 })
  }
}
