import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

function checkAuth(req: NextRequest) {
  const pwd = req.headers.get("x-admin-password")
  return pwd === process.env.ADMIN_PASSWORD
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAuth(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const body = await req.json()
    const db = createServerClient()

    const { data, error } = await db
      .from("discount_codes")
      .update(body)
      .eq("id", params.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error("[admin/discount-codes PUT] error:", err)
    return NextResponse.json({ error: "Error al actualizar código" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAuth(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const db = createServerClient()
    const { error } = await db.from("discount_codes").delete().eq("id", params.id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[admin/discount-codes DELETE] error:", err)
    return NextResponse.json({ error: "Error al eliminar código" }, { status: 500 })
  }
}
