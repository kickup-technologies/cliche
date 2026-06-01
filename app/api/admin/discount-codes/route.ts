import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { isAdmin } from "@/lib/admin-auth"

function checkAuth(req: NextRequest) {
  return isAdmin(req)
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const db = createServerClient()
    const { data, error } = await db
      .from("discount_codes")
      .select("*, code_redemptions(count)")
      .order("created_at", { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error("[admin/discount-codes GET] error:", err)
    return NextResponse.json({ error: "Error al obtener códigos" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const body = await req.json()
    const { code, type, value, max_uses, expires_at, is_active } = body

    if (!code || !type || value === undefined) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    const db = createServerClient()
    const { data, error } = await db
      .from("discount_codes")
      .insert({
        code: code.toUpperCase().trim(),
        type,
        value: Number(value),
        max_uses: max_uses || null,
        expires_at: expires_at || null,
        is_active: is_active ?? true,
        uses_count: 0,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error("[admin/discount-codes POST] error:", err)
    return NextResponse.json({ error: "Error al crear código" }, { status: 500 })
  }
}
