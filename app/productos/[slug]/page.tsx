import { notFound } from "next/navigation"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { ProductDetail } from "@/components/product-detail"
import { CATALOG_AS_PRODUCTS, getCatalogProduct } from "@/lib/catalog-data"
import type { Metadata } from "next"

// Force dynamic so pages always render on-demand from Supabase
export const dynamic = "force-dynamic"

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
    ...(product.rating > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: product.rating,
        reviewCount: product.reviews,
      },
    }),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetail product={product} related={related || []} />
    </>
  )
}
