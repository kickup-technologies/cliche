import { notFound } from "next/navigation"
import { createServerClient } from "@/lib/supabase"
import { ProductDetail } from "@/components/product-detail"
import type { Metadata } from "next"

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = createServerClient()
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single()

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
  const supabase = createServerClient()

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single()

  if (!product) notFound()

  // Fetch related products (same price range, different slug)
  const { data: related } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .neq("slug", slug)
    .limit(4)

  return <ProductDetail product={product} related={related || []} />
}

export async function generateStaticParams() {
  const supabase = createServerClient()
  const { data: products } = await supabase
    .from("products")
    .select("slug")
    .eq("is_active", true)

  return (products || []).map((p) => ({ slug: p.slug }))
}
