import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

/**
 * GET /api/recent-purchases
 * Devuelve compras REALES recientes (anonimizadas) para el social proof toast.
 * Reemplaza los datos inventados — evita riesgo de publicidad engañosa (SIC).
 * Si no hay compras reales, devuelve []  → el toast no se muestra.
 */
// Cacheado en el CDN de Vercel: 1 sola consulta a la BD por minuto para TODOS
// los visitantes (no una por carga). Clave para escalar a miles de usuarios sin
// saturar Supabase. El toast de social proof no necesita tiempo real.
const CACHE = "public, s-maxage=60, stale-while-revalidate=300"

function anonymizeName(full: string | null): string {
  if (!full) return "Alguien"
  const parts = full.trim().split(/\s+/)
  const first = parts[0]
  const lastInitial = parts[1]?.[0]
  return lastInitial ? `${first} ${lastInitial.toUpperCase()}.` : first
}

function minutesAgo(iso: string): number {
  return Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
}

export async function GET() {
  try {
    const supabase = createServerClient()
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: orders } = await supabase
      .from("orders")
      .select("customer_name, shipping_address, items, created_at")
      .in("status", ["confirmed", "shipped", "delivered"])
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(15)

    const purchases = (orders || [])
      .map((o) => {
        const items = (o.items as Array<{ name?: string }>) || []
        const product = items[0]?.name
        const city = (o.shipping_address as { city?: string } | null)?.city
        if (!product) return null
        return {
          name: anonymizeName(o.customer_name as string | null),
          city: city || "Colombia",
          product,
          minAgo: minutesAgo(o.created_at as string),
        }
      })
      .filter((x): x is { name: string; city: string; product: string; minAgo: number } => x !== null)

    return NextResponse.json({ purchases }, { headers: { "Cache-Control": CACHE } })
  } catch (err) {
    console.error("[recent-purchases]", err)
    return NextResponse.json({ purchases: [] })
  }
}
