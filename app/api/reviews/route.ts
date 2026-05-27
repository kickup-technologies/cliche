import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

// GET /api/reviews?product_id=xxx
export async function GET(req: NextRequest) {
  const product_id = req.nextUrl.searchParams.get("product_id")
  if (!product_id) {
    return NextResponse.json({ error: "product_id required" }, { status: 400 })
  }
  try {
    const db = createServerClient()
    const { data, error } = await db
      .from("reviews")
      .select("*")
      .eq("product_id", product_id)
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error("[reviews GET]", err)
    return NextResponse.json([], { status: 500 })
  }
}

// POST /api/reviews
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { product_id, reviewer_name, rating, comment, media_urls } = body as {
      product_id: string
      reviewer_name: string
      rating: number
      comment?: string
      media_urls?: string[]
    }
    if (!product_id || !reviewer_name || !rating) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating invalido" }, { status: 400 })
    }
    const db = createServerClient()
    const { data, error } = await db
      .from("reviews")
      .insert({
        product_id,
        reviewer_name: reviewer_name.trim(),
        rating,
        comment: comment?.trim() || null,
        media_urls: media_urls ?? [],
        is_approved: true,
      })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error("[reviews POST]", err)
    return NextResponse.json({ error: "Error al guardar la resena" }, { status: 500 })
  }
}
