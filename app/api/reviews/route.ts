import { NextRequest, NextResponse } from "next/server"
import { supabase, createServerClient } from "@/lib/supabase"
import { rateLimit } from "@/lib/rate-limit"

// Límites de longitud para evitar spam / contenido abusivo en reseñas públicas
const MAX_NAME = 80
const MAX_COMMENT = 1500
const MAX_MEDIA = 6
// Solo aceptamos URLs http(s) (las de nuestro storage). Bloquea javascript:,
// data:, etc. que podrían inyectarse en media_urls.
const isSafeUrl = (u: unknown): u is string =>
  typeof u === "string" && /^https?:\/\//i.test(u) && u.length <= 600

// GET /api/reviews?product_id=xxx — public anon client (RLS: approved only)
export async function GET(req: NextRequest) {
  const product_id = req.nextUrl.searchParams.get("product_id")
  if (!product_id) {
    return NextResponse.json({ error: "product_id required" }, { status: 400 })
  }
  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("product_id", product_id)
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
    if (error) throw error
    // Cacheado en el CDN: las reseñas se leen en cada visita a la ficha; con
    // esto la BD recibe ~1 consulta/min por producto, no una por visitante.
    return NextResponse.json(data ?? [], {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    })
  } catch (err) {
    console.error("[reviews GET]", err)
    return NextResponse.json([], { status: 500 })
  }
}

// POST /api/reviews — public anon client (RLS: anyone can insert)
export async function POST(req: NextRequest) {
  // Anti-spam: máx. 8 reseñas por IP cada 10 minutos
  const limited = rateLimit(req, { id: "reviews-post", limit: 8, windowMs: 10 * 60_000 })
  if (limited) return limited

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
    const ratingInt = Math.floor(Number(rating))
    if (!Number.isFinite(ratingInt) || ratingInt < 1 || ratingInt > 5) {
      return NextResponse.json({ error: "Rating invalido" }, { status: 400 })
    }
    // Saneado de entradas: recortar longitudes y filtrar URLs de medios.
    const safeName = String(reviewer_name).trim().slice(0, MAX_NAME)
    const safeComment = comment ? String(comment).trim().slice(0, MAX_COMMENT) : null
    const safeMedia = Array.isArray(media_urls)
      ? media_urls.filter(isSafeUrl).slice(0, MAX_MEDIA)
      : []
    if (!safeName) {
      return NextResponse.json({ error: "Nombre invalido" }, { status: 400 })
    }

    const reviewRow = {
      product_id: String(product_id),
      reviewer_name: safeName,
      rating: ratingInt,
      comment: safeComment,
      media_urls: safeMedia,
      is_approved: true,
    }

    // Try service role first (bypasses RLS), fall back to anon
    const db = (() => {
      try { return createServerClient() } catch { return supabase }
    })()

    const { data, error } = await db
      .from("reviews")
      .insert(reviewRow)
      .select()
      .single()

    if (error) {
      console.error("[reviews POST] DB error:", error)
      // Fallback: try anon client if service role failed
      const { data: d2, error: e2 } = await supabase
        .from("reviews")
        .insert(reviewRow)
        .select()
        .single()
      if (e2) throw e2
      return NextResponse.json(d2, { status: 201 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error("[reviews POST]", err)
    return NextResponse.json({ error: "Error al guardar la resena" }, { status: 500 })
  }
}
