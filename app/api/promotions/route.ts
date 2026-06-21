import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  const { data, error } = await supabase
    .from("promotions")
    .select("*")
    .eq("is_active", true)
    .or("end_time.is.null,end_time.gt.now()")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Cacheado en el CDN: las promos se consultan en cada carga; con esto la BD
  // recibe ~1 consulta/min en total, no una por visitante.
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  })
}
