import { NextRequest, NextResponse } from "next/server"
import { createServerClient, supabase } from "@/lib/supabase"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Try service role first (bypasses RLS), fall back to anon
    const db = (() => {
      try { return createServerClient() } catch { return supabase }
    })()

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
