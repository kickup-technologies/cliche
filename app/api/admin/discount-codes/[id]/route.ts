import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { isAdmin } from "@/lib/admin-auth"

function checkAuth(req: NextRequest) {
  return isAdmin(req)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params

  try {
    const body = await req.json()
    // Allowlist de campos editables: nunca dejamos que el body decida columnas
    // arbitrarias (mass assignment) como uses_count o id.
    const ALLOWED = ["code", "type", "value", "max_uses", "expires_at", "is_active"]
    const update: Record<string, unknown> = {}
    for (const k of ALLOWED) if (k in body) update[k] = body[k]
    if (typeof update.code === "string") update.code = update.code.toUpperCase().trim()
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 })
    }
    const db = createServerClient()
    const { data, error } = await db
      .from("discount_codes")
      .update(update)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error("[admin/discount-codes PUT]", err)
    return NextResponse.json({ error: "Error al actualizar código" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params

  try {
    const db = createServerClient()
    const { error } = await db.from("discount_codes").delete().eq("id", id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[admin/discount-codes DELETE]", err)
    return NextResponse.json({ error: "Error al eliminar código" }, { status: 500 })
  }
}
