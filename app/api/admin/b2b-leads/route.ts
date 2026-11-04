import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { isAdmin } from "@/lib/admin-auth"

/**
 * GET /api/admin/b2b-leads
 * Contactos del formulario de cotización de /empresas (tabla b2b_leads, RLS
 * sin políticas → solo service role). Protegido por la cookie firmada del
 * panel: son datos personales. Más recientes primero; tope 2.000 filas.
 */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const { data, error } = await createServerClient()
      .from("b2b_leads")
      .select(
        "id, created_at, necesidad, nombre, empresa, tipo_negocio, ciudad, cantidad, para_cuando, telefono, email, mensaje, origen, utm_source, utm_medium, utm_campaign, utm_content, utm_term, gclid, gbraid, wbraid, fbclid, referrer, landing_page, landed_at",
      )
      .order("created_at", { ascending: false })
      .limit(2000)
    if (error) throw error
    return NextResponse.json({ leads: data ?? [] })
  } catch (err) {
    console.error("[admin/b2b-leads]", err)
    return NextResponse.json({ error: "No se pudieron cargar los contactos de empresas." }, { status: 500 })
  }
}
