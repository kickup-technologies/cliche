import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { isAdmin } from "@/lib/admin-auth"

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // SOLO admin: este endpoint usa service role (salta RLS) y borra por id.
  // Sin este guard, cualquiera podía borrar cualquier reseña (o todas).
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const { id } = await params
    const db = createServerClient()

    const { error } = await db
      .from("reviews")
      .delete()
      .eq("id", id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[reviews DELETE]", err)
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 })
  }
}
