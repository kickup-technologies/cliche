import { NextResponse } from "next/server"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { CATALOG_AS_PRODUCTS } from "@/lib/catalog-data"
import { scheduleOpportunisticReconcile } from "@/lib/orders/auto-reconcile"

export async function GET() {
  // Red de seguridad de pagos: aprovecha el tráfico del catálogo para
  // reconciliar pagos perdidos en segundo plano (máx. 1 vez cada 30 min).
  scheduleOpportunisticReconcile()

  // Sin credenciales reales (local) → catálogo directo, sin esperar timeout.
  if (!isSupabaseConfigured) {
    return NextResponse.json(CATALOG_AS_PRODUCTS, {
      headers: { "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300" },
    })
  }

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true })

  // Fallback al catálogo local cuando Supabase falla o aún no tiene productos.
  if (error || !data || data.length === 0) {
    return NextResponse.json(CATALOG_AS_PRODUCTS, {
      headers: { "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300" },
    })
  }

  return NextResponse.json(data, {
    // CDN (s-maxage) + navegador (max-age): el catálogo se pide en varias vistas;
    // con max-age el navegador lo reutiliza al navegar sin re-pedirlo cada vez.
    headers: { "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300" },
  })
}
