import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

function checkAuth(req: NextRequest) {
  return req.headers.get("x-admin-password") === process.env.ADMIN_PASSWORD
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params

  try {
    const { stock } = await req.json()
    if (stock === undefined || stock < 0) {
      return NextResponse.json({ error: "Stock inválido" }, { status: 400 })
    }

    const db = createServerClient()
    const { data, error } = await db
      .from("products")
      .update({ stock: Number(stock) })
      .eq("id", id)
      .select("id, name, price, stock, image_url")
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error("[admin/products PUT]", err)
    return NextResponse.json({ error: "Error al actualizar stock" }, { status: 500 })
  }
}
