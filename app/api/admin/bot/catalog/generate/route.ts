import { NextRequest, NextResponse } from "next/server"
import { isAdmin } from "@/lib/admin-auth"
import { createServerClient } from "@/lib/supabase"
import { CATALOG } from "@/lib/catalog-data"
import { CatalogDocument } from "@/lib/catalog-pdf"
import { renderToBuffer } from "@react-pdf/renderer"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const BUCKET = "catalog"

// POST → genera el catálogo PDF de marca, lo sube a Storage y guarda su URL.
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "no autorizado" }, { status: 401 })
  try {
    const sb = createServerClient()

    // Precios reales por slug (la tabla products manda sobre el catálogo local).
    const { data: live } = await sb.from("products").select("slug, price, is_active")
    const priceBySlug = new Map<string, number>()
    ;(live || []).forEach((p: { slug: string; price: number; is_active: boolean }) => {
      if (p.is_active) priceBySlug.set(p.slug, p.price)
    })
    const products = CATALOG.map((p) => ({ ...p, price: priceBySlug.get(p.slug) ?? p.price }))

    // Datos de contacto desde site_settings.
    const { data: setts } = await sb.from("site_settings").select("key, value")
    const settings: Record<string, string> = {}
    ;(setts || []).forEach((s: { key: string; value: string }) => (settings[s.key] = s.value))
    const whatsapp = settings.whatsapp_number ? `+${settings.whatsapp_number}` : ""

    const buffer = await renderToBuffer(
      CatalogDocument({ products, whatsapp, web: "clichecolombia.com" }),
    )

    await sb.storage.createBucket(BUCKET, { public: true }).then(undefined, () => {})
    const path = `catalogo-cliche-${Date.now()}.pdf`
    const { error: upErr } = await sb.storage.from(BUCKET).upload(path, buffer, { contentType: "application/pdf", upsert: true })
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

    const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path)
    const url = pub.publicUrl
    await sb.from("wa_bot_config").upsert({ id: 1, catalog_pdf_url: url, updated_at: new Date().toISOString() }, { onConflict: "id" })
    return NextResponse.json({ ok: true, url })
  } catch (e) {
    console.error("[catalog/generate]", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
