import { NextRequest, NextResponse } from "next/server"
import { createServerClient, supabase } from "@/lib/supabase"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Try service role (bypasses RLS), fall back to anon
    const db = (() => {
      try { return createServerClient() } catch { return supabase }
    })()

    const { error } = await db
      .from("reviews")
      .delete()
      .eq("id", params.id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[reviews DELETE]", err)
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 })
  }
}
