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
    const db = createServerClient()
    const { data, error } = await db
      .from("discount_codes")
      .update(body)
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
