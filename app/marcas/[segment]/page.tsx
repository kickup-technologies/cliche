import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { AnnouncementBar } from "@/components/announcement-bar"
import { WhatsAppButton } from "@/components/whatsapp-button"
import { Leaf, Sparkles, Clock, ShieldCheck, ArrowRight } from "lucide-react"
import { createServerClient, isSupabaseConfigured, type Product } from "@/lib/supabase"
import { CATALOG, getCatalogProduct } from "@/lib/catalog-data"
import { SEGMENTS, productsBySegment } from "@/lib/segments"
import { PRICE_TIERS } from "@/lib/pricing"
import { PRODUCT_PLACEHOLDER } from "@/lib/placeholder"

/**
 * Landing por segmento de marca — /marcas/[segment]
 *
 * Página de aterrizaje para la pauta de Meta: el anuncio de "aromas para
 * marcas de mascotas" cae aquí (no en el home genérico), con copy y productos
 * SOLO de ese segmento. Estática con ISR: carga rápida en móvil, precios y
 * stock se refrescan cada hora.
 */

export const revalidate = 3600

// Copy de apertura por segmento — habla el idioma de cada audiencia.
const SEGMENT_INTRO: Record<string, string> = {
  femeninas: "Tus prendas hablan de tu marca antes que tú. Estos aromas las visten de delicadeza, elegancia y ese detalle que tus clientas recuerdan.",
  masculinas: "Una marca con carácter también se huele. Aromas amaderados y profundos que proyectan seguridad en cada prenda y cada espacio.",
  unisex: "Frescura que le habla a todos tus clientes por igual. Aromas versátiles que acompañan tu marca sin encasillarla.",
  infantiles: "Suaves, dulces y seguros. Aromas pensados para marcas que cuidan a los más pequeños — sin irritar y sin manchar.",
  deportivas: "Energía que se siente al ponerse la prenda. Aromas frescos y vitales para marcas que están en movimiento.",
  accesorios: "Un bolso, unos zapatos, una pieza única — y una estela que la vuelve inolvidable. El detalle olfativo de las marcas memorables.",
  bano: "Verano eterno en cada prenda. Aromas tropicales que evocan playa, sol y buena vibra para tu marca de vestidos de baño.",
  hoteles: "La primera impresión de tu huésped entra por la nariz. Aromas que hacen que quieran quedarse — y volver.",
  spa: "Calma embotellada. Aromas serenos que convierten tu spa o estudio en un refugio que tus clientes no quieren abandonar.",
  hogar: "Espacios que se sienten cuidados transmiten confianza. Aromas limpios y elegantes para hogares, oficinas y consultorios.",
  mascotas: "Frescura limpia y 100% segura para ellos. Aromas diseñados para marcas de mascotas y sus espacios — sin irritar.",
  luxury: "El lujo se huele antes de verse. Estelas premium para marcas luxury y streetwear que juegan en otra categoría.",
}

const BENEFITS = [
  { Icon: Leaf, text: "100% natural — no mancha textiles" },
  { Icon: Clock, text: "Hasta 8 horas de duración" },
  { Icon: Sparkles, text: "Artesanal, hecho en Colombia" },
  { Icon: ShieldCheck, text: "Pago seguro con Mercado Pago" },
]

function cop(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n)
}

async function loadProducts(): Promise<Product[]> {
  if (isSupabaseConfigured) {
    try {
      const { data } = await createServerClient()
        .from("products")
        .select("id, name, slug, price, image_url, stock, is_active")
        .eq("is_active", true)
      if (data?.length) return data as Product[]
    } catch { /* fallback local */ }
  }
  return CATALOG
}

export function generateStaticParams() {
  return SEGMENTS.map((s) => ({ segment: s.key }))
}

export async function generateMetadata({ params }: { params: Promise<{ segment: string }> }): Promise<Metadata> {
  const { segment } = await params
  const seg = SEGMENTS.find((s) => s.key === segment)
  if (!seg) return {}
  return {
    title: `Aromas para ${seg.label.toLowerCase()}`,
    description: `${seg.tagline} Sprays artesanales 100% naturales, hechos en Colombia. Envío a todo el país.`,
    alternates: { canonical: `/marcas/${seg.key}` },
  }
}

export default async function SegmentLanding({ params }: { params: Promise<{ segment: string }> }) {
  const { segment } = await params
  const seg = SEGMENTS.find((s) => s.key === segment)
  if (!seg) notFound()

  const pool = await loadProducts()
  const products = productsBySegment(seg.key, pool)
  if (products.length === 0) notFound()

  const kit3 = PRICE_TIERS.find((t) => t.id === "x3")

  return (
    <>
      <AnnouncementBar />
      <Header />
      <main className="min-h-screen bg-[#FAF8F5]">
        {/* Hero */}
        <section className="px-6 pt-14 pb-10 sm:pt-20 sm:pb-14 text-center max-w-3xl mx-auto">
          <p className="text-[11px] font-medium uppercase tracking-[0.35em] text-[#A67163] mb-4">
            Marketing olfativo · Cliché Colombia
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl text-[#2D1A14] leading-tight text-balance">
            Aromas para {seg.label.toLowerCase()}
          </h1>
          <p className="mt-5 text-[15px] sm:text-base text-[#2D1A14]/70 leading-relaxed max-w-xl mx-auto">
            {SEGMENT_INTRO[seg.key] || seg.tagline}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#coleccion"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#2D1A14] text-white text-sm font-semibold"
            >
              Ver los aromas <ArrowRight className="w-4 h-4" />
            </a>
            {kit3 && (
              <p className="text-xs text-[#2D1A14]/60">
                Desde {cop(PRICE_TIERS[0].price)} · Kit x3 por {cop(kit3.price)}
              </p>
            )}
          </div>
        </section>

        {/* Beneficios */}
        <section className="border-y border-[#2D1A14]/10 bg-white">
          <div className="max-w-5xl mx-auto px-6 py-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {BENEFITS.map(({ Icon, text }) => (
              <div key={text} className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 flex-shrink-0 text-[#A67163]" />
                <span className="text-[11px] sm:text-xs text-[#2D1A14]/70 leading-snug">{text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Colección del segmento */}
        <section id="coleccion" className="max-w-6xl mx-auto px-6 py-12 sm:py-16">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-10 sm:gap-x-8">
            {products.map((p, i) => {
              const cat = getCatalogProduct(p.slug)
              const img = p.image_url || cat?.image_url || PRODUCT_PLACEHOLDER
              return (
                <Link key={p.slug} href={`/productos/${p.slug}`} className="group block">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-white border border-[#2D1A14]/8">
                    <Image
                      src={img}
                      alt={p.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 350px"
                      className="object-contain p-4 transition-transform duration-500 group-hover:scale-[1.04]"
                      priority={i < 2}
                    />
                  </div>
                  <div className="mt-3">
                    <h2 className="font-serif text-base sm:text-lg text-[#2D1A14] leading-snug">{p.name}</h2>
                    {cat?.tagline && (
                      <p className="text-xs text-[#A67163] italic mt-0.5">{cat.tagline}</p>
                    )}
                    <p className="text-sm font-semibold text-[#2D1A14] mt-1.5">{cop(p.price)}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* CTA de cierre */}
        <section className="bg-[#2D1A14] text-center px-6 py-14 sm:py-16">
          <h2 className="font-serif text-2xl sm:text-3xl text-[#FAF8F5] text-balance max-w-xl mx-auto">
            ¿No sabes cuál elegir para tu marca?
          </h2>
          <p className="mt-3 text-sm text-[#FAF8F5]/70 max-w-md mx-auto">
            Escríbenos por WhatsApp y nuestra asesora te recomienda el aroma exacto para tu marca — sin compromiso.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://wa.me/573053374066?text=Hola%2C%20quiero%20una%20recomendaci%C3%B3n%20de%20aroma%20para%20mi%20marca"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#A67163] text-white text-sm font-semibold"
            >
              Hablar con una asesora
            </a>
            <Link href="/catalogo" className="text-sm text-[#FAF8F5]/80 underline underline-offset-4">
              Ver todo el catálogo
            </Link>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  )
}
