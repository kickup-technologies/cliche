import { renderToFile } from "@react-pdf/renderer"
import { CatalogDocument } from "@/lib/catalog-pdf"
import { CATALOG } from "@/lib/catalog-data"

async function main() {
  await renderToFile(
    CatalogDocument({ products: CATALOG, whatsapp: "+57 319 456 5463", web: "cliche-nine.vercel.app" }),
    "public/catalogo-cliche.pdf",
  )
  console.log("PDF generado en public/catalogo-cliche.pdf")
}

main().catch((e) => { console.error(e); process.exit(1) })
