import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

function checkAuth(req: NextRequest) {
  const pwd = req.headers.get("x-admin-password")
  return pwd === process.env.ADMIN_PASSWORD
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAuth(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const { stock } = await req.json()

    if (stock === undefined || stock < 0) {
      return NextResponse.json({ error: "Stock inválido" }, { status: 400 })
    }

    const db = createServerClient()
    const { data, error } = await db
      .from("products")
      .update({ stock: Number(stock) })
      .eq("id", params.id)
      .select("id, name, price, stock, image_url")
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error("[admin/products PUT] error:", err)
    return NextResponse.json({ error: "Error al actualizar stock" }, { status: 500 })
  }
}
