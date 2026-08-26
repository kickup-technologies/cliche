// Script one-off: regenera el catálogo PDF con branding Cliché Colombia,
// lo sube a Storage y actualiza wa_bot_config.catalog_pdf_url.
// Uso: pnpm dlx tsx scripts/regen-catalog.ts   (lee .env.local)
import fs from "fs"
import path from "path"

// Carga .env.local antes de importar módulos que leen process.env.
const envFile = path.join(process.cwd(), ".env.local")
for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
}

async function main() {
  const { createServerClient } = await import("@/lib/supabase")
  const { CATALOG, getCatalogProduct } = await import("@/lib/catalog-data")
  const { CatalogDocument } = await import("@/lib/catalog-pdf")
  const { renderToBuffer } = await import("@react-pdf/renderer")

  const sb = createServerClient()

  const { data: live, error } = await sb.from("products").select("*").eq("is_active", true).order("name")
  if (error) throw new Error("products: " + error.message)
  console.log(`productos en vivo: ${live?.length ?? 0}`)

  const products = (live?.length ? live : CATALOG).map((p: any) => {
    const cat = getCatalogProduct(p.slug)
    return {
      ...p,
      tagline: p.tagline ?? cat?.tagline ?? "",
      notes: p.notes ?? cat?.notes ?? [],
      recommendedFor: p.recommendedFor ?? cat?.recommendedFor ?? "",
    }
  })

  const { data: setts } = await sb.from("site_settings").select("key, value")
  const settings: Record<string, string> = {}
  ;(setts || []).forEach((s: { key: string; value: string }) => (settings[s.key] = s.value))
  const whatsapp = settings.whatsapp_number ? `+${settings.whatsapp_number}` : ""

  const buffer = await renderToBuffer(CatalogDocument({ products, whatsapp, web: "clichecolombia.com" }) as any)
  console.log(`PDF generado: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`)

  fs.writeFileSync(path.join(process.cwd(), "public", "catalogo-cliche.pdf"), buffer)

  const BUCKET = "catalog"
  await sb.storage.createBucket(BUCKET, { public: true }).then(undefined, () => {})
  const file = `catalogo-cliche-${buffer.length}.pdf`
  const { error: upErr } = await sb.storage.from(BUCKET).upload(file, buffer, { contentType: "application/pdf", upsert: true })
  if (upErr) throw new Error("upload: " + upErr.message)

  const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(file)
  const url = pub.publicUrl
  const { error: cfgErr } = await sb
    .from("wa_bot_config")
    .upsert({ id: 1, catalog_pdf_url: url, updated_at: new Date().toISOString() }, { onConflict: "id" })
  if (cfgErr) throw new Error("config: " + cfgErr.message)

  console.log("catalog_pdf_url =", url)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
