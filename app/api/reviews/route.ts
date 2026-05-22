import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get("product_id")
  if (!productId) return NextResponse.json([])

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("reviews")
    .select("id, reviewer_name, rating, comment, created_at")
    .eq("product_id", productId)
    .eq("is_approved", true)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json([], { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { product_id, reviewer_name, rating, comment } = body

  if (!product_id || !reviewer_name || !rating) {
    return NextResponse.json({ error: "Campos requeridos: product_id, reviewer_name, rating" }, { status: 400 })
  }

  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating debe ser entre 1 y 5" }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("reviews")
    .insert({ product_id, reviewer_name: reviewer_name.trim(), rating, comment: comment?.trim() || null, is_approved: true })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
