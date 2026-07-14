import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  const { data, error } = await supabase
    .from("promotions")
    .select("*")
    .eq("is_active", true)
    .or("end_time.is.null,end_time.gt.now()")

  if (error) {
    // No filtramos el mensaje crudo de Postgres al público: se loguea en server
    // y al cliente le va un mensaje genérico.
    console.error("[promotions] error:", error.message)
    return NextResponse.json({ error: "No se pudieron cargar las promociones" }, { status: 500 })
  }

  // Cacheado en el CDN: las promos se consultan en cada carga; con esto la BD
  // recibe ~1 consulta/min en total, no una por visitante.
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  })
}
