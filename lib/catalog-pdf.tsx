import React from "react"
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer"
import fs from "fs"
import path from "path"
import { CATALOG, type CatalogProduct } from "@/lib/catalog-data"

// ── Catálogo Cliché en PDF — diseño de marca ───────────────────────────────────
// Paleta: crema #FAF8F5 · café #2D1A14 · terracota #A67163.
// Fuentes: Times-Roman (serif, titulares) + Helvetica (cuerpo) — integradas.

const CREAM = "#FAF8F5"
const BROWN = "#2D1A14"
const ACCENT = "#A67163"
const MUTED = "#8a7a72"

const cop = (n: number) => "$" + n.toLocaleString("es-CO")

// @react-pdf solo soporta JPEG/PNG (no WEBP) y en Windows falla con rutas
// absolutas ("C:\\..."). Por eso incrustamos la imagen como data URI,
// eligiendo un formato soportado que exista para el slug.
const MIME: Record<string, string> = { jpeg: "image/jpeg", jpg: "image/jpeg", png: "image/png" }

function resolveImage(p: CatalogProduct): string | null {
  const dir = path.join(process.cwd(), "public", "images", "products")
  const givenExt = (p.image_url || "").split(".").pop()?.toLowerCase() || ""
  const exts = [givenExt, "jpeg", "jpg", "png"].filter((e, i, a) => MIME[e] && a.indexOf(e) === i)
  for (const ext of exts) {
    const abs = path.join(dir, `${p.slug}.${ext}`)
    try {
      if (fs.existsSync(abs)) {
        const b64 = fs.readFileSync(abs).toString("base64")
        return `data:${MIME[ext]};base64,${b64}`
      }
    } catch {
      /* probar siguiente extensión */
    }
  }
  return null
}

const s = StyleSheet.create({
  cover: { backgroundColor: BROWN, color: CREAM, height: "100%", padding: 56, justifyContent: "center" },
  coverKicker: { fontFamily: "Helvetica", fontSize: 11, letterSpacing: 4, color: ACCENT, textTransform: "uppercase", marginBottom: 18 },
  coverTitle: { fontFamily: "Times-Roman", fontSize: 46, color: CREAM, lineHeight: 1.05 },
  coverScript: { fontFamily: "Times-Italic", fontSize: 22, color: ACCENT, marginTop: 14 },
  coverRule: { width: 70, height: 2, backgroundColor: ACCENT, marginTop: 28, marginBottom: 28 },
  coverMeta: { fontFamily: "Helvetica", fontSize: 11, color: "#d8cfc8", lineHeight: 1.7 },

  page: { backgroundColor: CREAM, paddingVertical: 40, paddingHorizontal: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 1, borderBottomColor: "#e3dcd5", paddingBottom: 10, marginBottom: 18 },
  headerBrand: { fontFamily: "Times-Roman", fontSize: 14, color: BROWN },
  headerTag: { fontFamily: "Helvetica", fontSize: 8, color: MUTED, letterSpacing: 2, textTransform: "uppercase" },

  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  card: { width: "48%", backgroundColor: "white", borderRadius: 10, padding: 14, marginBottom: 16, border: "1px solid #ece5df" },
  img: { width: "100%", height: 130, objectFit: "contain", marginBottom: 10 },
  imgPlaceholder: { width: "100%", height: 130, marginBottom: 10, backgroundColor: CREAM, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  imgPlaceholderText: { fontFamily: "Times-Italic", fontSize: 12, color: ACCENT },
  name: { fontFamily: "Times-Roman", fontSize: 16, color: BROWN },
  tagline: { fontFamily: "Times-Italic", fontSize: 10, color: ACCENT, marginTop: 2, marginBottom: 8 },
  label: { fontFamily: "Helvetica-Bold", fontSize: 7, color: MUTED, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 6 },
  notes: { fontFamily: "Helvetica", fontSize: 9, color: "#5b4d46", lineHeight: 1.4 },
  ideal: { fontFamily: "Helvetica", fontSize: 9, color: "#5b4d46", lineHeight: 1.4 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, borderTopWidth: 1, borderTopColor: "#f0eae4", paddingTop: 8 },
  price: { fontFamily: "Helvetica-Bold", fontSize: 14, color: BROWN },
  priceLabel: { fontFamily: "Helvetica", fontSize: 8, color: MUTED },

  footer: { position: "absolute", bottom: 22, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e3dcd5", paddingTop: 8 },
  footerText: { fontFamily: "Helvetica", fontSize: 8, color: MUTED },
})

function ProductCard({ p }: { p: CatalogProduct }) {
  const img = resolveImage(p)
  return (
    <View style={s.card} wrap={false}>
      {img ? (
        <Image src={img} style={s.img} />
      ) : (
        <View style={s.imgPlaceholder}><Text style={s.imgPlaceholderText}>{p.name}</Text></View>
      )}
      <Text style={s.name}>{p.name}</Text>
      {p.tagline ? <Text style={s.tagline}>{p.tagline}</Text> : null}
      {p.notes?.length ? (
        <>
          <Text style={s.label}>Notas olfativas</Text>
          <Text style={s.notes}>{p.notes.join(" · ")}</Text>
        </>
      ) : null}
      {p.recommendedFor ? (
        <>
          <Text style={s.label}>Ideal para</Text>
          <Text style={s.ideal}>{p.recommendedFor}</Text>
        </>
      ) : null}
      <View style={s.priceRow}>
        <Text style={s.priceLabel}>Precio</Text>
        <Text style={s.price}>{cop(p.price)}</Text>
      </View>
    </View>
  )
}

export function CatalogDocument({
  products = CATALOG,
  whatsapp = "",
  web = "",
}: {
  products?: CatalogProduct[]
  whatsapp?: string
  web?: string
}) {
  const perPage = 4
  const pages: CatalogProduct[][] = []
  for (let i = 0; i < products.length; i += perPage) pages.push(products.slice(i, i + perPage))

  return (
    <Document title="Catálogo Bienestar by Cliché" author="Bienestar by Cliché">
      {/* Portada */}
      <Page size="A4">
        <View style={s.cover}>
          <Text style={s.coverKicker}>Marketing olfativo</Text>
          <Text style={s.coverTitle}>Bienestar{"\n"}by Cliché</Text>
          <Text style={s.coverScript}>Tu marca, ¿a qué huele?</Text>
          <View style={s.coverRule} />
          <Text style={s.coverMeta}>
            Catálogo de aromas y sprays para hogar, textiles y marca.{"\n"}
            {products.length} fragancias artesanales · Colombia{"\n"}
            {whatsapp ? `WhatsApp ${whatsapp}` : ""}{web ? `   ·   ${web}` : ""}
          </Text>
        </View>
      </Page>

      {/* Páginas de productos */}
      {pages.map((chunk, idx) => (
        <Page key={idx} size="A4" style={s.page}>
          <View style={s.header}>
            <Text style={s.headerBrand}>Bienestar by Cliché</Text>
            <Text style={s.headerTag}>Catálogo de aromas</Text>
          </View>
          <View style={s.grid}>
            {chunk.map((p) => <ProductCard key={p.slug} p={p} />)}
          </View>
          <View style={s.footer} fixed>
            <Text style={s.footerText}>{whatsapp ? `WhatsApp ${whatsapp}` : "Bienestar by Cliché"}</Text>
            <Text style={s.footerText} render={({ pageNumber }) => `${web || "bienestar by cliché"}  ·  ${pageNumber}`} />
          </View>
        </Page>
      ))}
    </Document>
  )
}
