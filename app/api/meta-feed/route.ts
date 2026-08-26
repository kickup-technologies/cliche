import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { CATALOG, getCatalogProduct } from "@/lib/catalog-data"
import type { Product } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SITE = "https://www.clichecolombia.com"

/**
 * GET /api/meta-feed — feed de catálogo para Meta Commerce (CSV).
 *
 * Se registra en Meta Commerce Manager como "data feed programado" apuntando a
 * esta URL. El campo `id` es el UUID del producto: el MISMO que el píxel y la
 * CAPI envían en content_ids (ViewContent/AddToCart/Purchase), requisito para
 * que funcionen los anuncios dinámicos (Advantage+ catalog / retargeting DPA).
 *
 * Spec: https://www.facebook.com/business/help/120325381656392
 */

// CSV de Meta: comillas dobles alrededor de cada campo, comillas internas duplicadas.
function csvCell(v: string): string {
  return `"${(v || "").replace(/"/g, '""').replace(/\r?\n/g, " ").trim()}"`
}

export async function GET() {
  try {
    const sb = createServerClient()
    const { data: live } = await sb.from("products").select("*").eq("is_active", true).order("name")
    const products = (live?.length ? (live as Product[]) : CATALOG).filter((p) => p.is_active !== false)

    const header = [
      "id", "title", "description", "availability", "condition", "price",
      "link", "image_link", "brand", "google_product_category",
    ].join(",")

    const rows = products.map((p) => {
      const cat = getCatalogProduct(p.slug)
      const desc = (p.description || cat?.description || cat?.tagline || p.name).slice(0, 4990)
      const image = p.image_url?.startsWith("http") ? p.image_url : `${SITE}${p.image_url || ""}`
      const availability = typeof p.stock === "number" && p.stock <= 0 ? "out of stock" : "in stock"
      return [
        csvCell(p.id),
        csvCell(p.name),
        csvCell(desc),
        csvCell(availability),
        csvCell("new"),
        csvCell(`${Number(p.price).toFixed(2)} COP`),
        csvCell(`${SITE}/productos/${p.slug}`),
        csvCell(image),
        csvCell("Cliché Colombia"),
        // Home Fragrances (taxonomía de Google que Meta reutiliza)
        csvCell("Home & Garden > Decor > Home Fragrances"),
      ].join(",")
    })

    return new NextResponse([header, ...rows].join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        // Meta refresca el feed en horario programado; 1h de cache es suficiente.
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (e) {
    console.error("[meta-feed]", e)
    return new NextResponse("error", { status: 500 })
  }
}
