import { NextRequest, NextResponse } from "next/server"
import { isAdmin } from "@/lib/admin-auth"
import { createServerClient } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BUCKET = "catalog"

// POST (multipart) file=PDF → sube a Supabase Storage y guarda la URL en config.
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "no autorizado" }, { status: 401 })
  try {
    const form = await req.formData()
    const file = form.get("file") as File | null
    if (!file) return NextResponse.json({ error: "falta el archivo" }, { status: 400 })
    if (file.type && file.type !== "application/pdf") {
      return NextResponse.json({ error: "el archivo debe ser PDF" }, { status: 400 })
    }

    const sb = createServerClient()
    // Crear bucket público si no existe (idempotente).
    await sb.storage.createBucket(BUCKET, { public: true }).then(undefined, () => {})

    const buffer = Buffer.from(await file.arrayBuffer())
    const path = `catalogo-cliche-${Date.now()}.pdf`
    const { error: upErr } = await sb.storage.from(BUCKET).upload(path, buffer, {
      contentType: "application/pdf",
      upsert: true,
    })
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

    const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path)
    const url = pub.publicUrl
    await sb.from("wa_bot_config").upsert({ id: 1, catalog_pdf_url: url, updated_at: new Date().toISOString() }, { onConflict: "id" })
    return NextResponse.json({ ok: true, url })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
