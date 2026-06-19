import { notFound } from "next/navigation"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { ProductDetail } from "@/components/product-detail"
import { CATALOG_AS_PRODUCTS, getCatalogProduct } from "@/lib/catalog-data"
import { seededReviews } from "@/lib/seed-reviews"
import type { Metadata } from "next"

// ISR: páginas estáticas servidas desde CDN, regeneradas cada 5 min. Escala a
// miles de peticiones sin golpear Supabase en cada visita (solo en build/revalidación).
export const revalidate = 300
export const dynamicParams = true

// Pre-genera en build las páginas de los productos activos.
export async function generateStaticParams() {
  try {
    if (isSupabaseConfigured) {
      const { data } = await supabase.from("products").select("slug").eq("is_active", true)
      if (data && data.length) return data.map((p) => ({ slug: p.slug }))
    }
  } catch {
    /* fallback al catálogo local */
  }
  return CATALOG_AS_PRODUCTS.map((p) => ({ slug: p.slug }))
}

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { data: dbProduct } = isSupabaseConfigured
    ? await supabase
        .from("products")
        .select("name, description, image_url")
        .eq("slug", slug)
        .eq("is_active", true)
        .single()
    : { data: null }

  const product = dbProduct || getCatalogProduct(slug)
  if (!product) return { title: "Producto no encontrado" }

  return {
    title: product.name,
    description: product.description || `${product.name} — Bienestar by Cliché`,
    openGraph: {
      title: product.name,
      description: product.description || "",
      images: product.image_url ? [{ url: product.image_url }] : [],
    },
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params

  const { data: dbProduct } = isSupabaseConfigured
    ? await supabase
        .from("products")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single()
    : { data: null }

  // Fallback al catálogo local cuando Supabase no está disponible / vacío
  const product = dbProduct || getCatalogProduct(slug)
  if (!product) notFound()

  const { data: dbRelated } = isSupabaseConfigured
    ? await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .neq("slug", slug)
        .limit(4)
    : { data: null }

  const related =
    dbRelated && dbRelated.length > 0
      ? dbRelated
      : CATALOG_AS_PRODUCTS.filter((p) => p.slug !== slug).slice(0, 4)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? `${product.name} — Cliché Aromas Colombia`,
    image: product.image_url ? [product.image_url] : [],
    brand: { "@type": "Brand", name: "Cliché Aromas" },
    offers: {
      "@type": "Offer",
      priceCurrency: "COP",
      price: product.price,
      availability: product.stock > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: "Cliché Aromas" },
    },
    ...(() => {
      // Mismas reseñas semilla que ve el usuario → structured data consistente
      const seeds = seededReviews(product.id)
      if (!seeds.length) return {}
      const avg = seeds.reduce((s, r) => s + r.rating, 0) / seeds.length
      return {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: Number(avg.toFixed(1)),
          reviewCount: seeds.length,
        },
      }
    })(),
  }

  return (
    <>
      <script
        type="application/ld+json"
        // Escapamos "<" → "<" para que ningún dato del producto pueda
        // cerrar el <script> e inyectar HTML/JS (XSS por JSON-LD).
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <ProductDetail product={product} related={related || []} />
    </>
  )
}
