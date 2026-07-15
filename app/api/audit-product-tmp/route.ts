import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { pickProductFields, revalidateProductPages } from "../admin/products/route"

/**
 * TEMPORAL — BORRAR TRAS USAR. Prueba de auditoría del flujo guardar→reflejar:
 * edita la descripción del producto "prueba" usando EXACTAMENTE el mismo código
 * que la API admin (pickProductFields + update + revalidateProductPages) y luego
 * confirma leyendo su ficha que el cambio se plasmó. Protegido por secreto.
 */
const SECRET = "a3f9c1e7b2d84056"

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("key") !== SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const restore = req.nextUrl.searchParams.get("restore")
  const db = createServerClient()
  const { data: prod } = await db.from("products").select("id, slug, description").eq("slug", "prueba").single()
  if (!prod) return NextResponse.json({ error: "sin producto prueba" }, { status: 404 })

  const marker = "AUDITORIA_REFLEJO_OK_98213"
  const newDesc = restore ? "Producto de prueba de pagos." : marker
  const fields = pickProductFields({ description: newDesc })
  fields.updated_at = new Date().toISOString()
  const { error } = await db.from("products").update(fields).eq("id", prod.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidateProductPages(prod.slug)

  return NextResponse.json({ slug: prod.slug, descAntes: prod.description, descAhora: newDesc, marker })
}
