import { notFound } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { ProductDetail } from "@/components/product-detail"
import type { Metadata } from "next"

// Force dynamic so pages always render on-demand from Supabase
export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { data: product } = await supabase
    .from("products")
    .select("name, description, image_url")
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

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single()

  if (!product) notFound()

  const { data: related } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .neq("slug", slug)
    .limit(4)

  return <ProductDetail product={product} related={related || []} />
}
