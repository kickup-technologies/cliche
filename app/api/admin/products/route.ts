import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

function checkAuth(req: NextRequest) {
  const pwd = req.headers.get("x-admin-password")
  return pwd === process.env.ADMIN_PASSWORD
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

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
