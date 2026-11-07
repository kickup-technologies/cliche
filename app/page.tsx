import type { Metadata } from "next"
import { getSeoOverride, SEO_PAGES } from "@/lib/seo"
import { Header } from "@/components/header"
import { AnnouncementBar } from "@/components/announcement-bar"
import { Footer } from "@/components/footer"
import { WhatsAppButton } from "@/components/whatsapp-button"

// ── Capa editorial (estructura estilo renesmehair, marca Cliché) ──
import { EditorialHero } from "@/components/editorial/editorial-hero"
import { getHeroOverrides } from "@/lib/editorial-hero-server"
import { ImageTextOverlay } from "@/components/editorial/image-text-overlay"
import { ValuesColumns } from "@/components/editorial/values-columns"
import { EditorialNewsletter } from "@/components/editorial/editorial-newsletter"
import { ScrollReveal } from "@/components/editorial/scroll-reveal"
import { FavoritosInicio } from "@/components/favoritos-inicio"
import { ParaQueCliche, PortadaCliche } from "@/components/inicio-cliche"
import { Guarantees } from "@/components/editorial/guarantees"
import { Faq } from "@/components/editorial/faq"
import { ProductShowcase3D } from "@/components/editorial/product-showcase-3d"
import { SegmentShowcase } from "@/components/editorial/segment-showcase"
import { BrandLogos } from "@/components/editorial/brand-logos"
import { CustomPackCTA } from "@/components/editorial/custom-pack-cta"
import { SocialProofBar } from "@/components/editorial/social-proof-bar"

/**
 * Landing — arquitectura de embudo de ventas (AIDA + objeciones + riesgo):
 *
 *  ATENCIÓN   1. Hero con CTA único + microcopy de confianza
 *  CONFIANZA  2. Marquee de atributos
 *  DESEO      3. Más vendidos (el producto manda, arriba)
 *  CREENCIA   4. Valores — razones para creer
 *  EMOCIÓN    5. Banda ritual full-bleed con parallax
 *             6. Pausa editorial — texto gigante scroll-driven
 *  SEGMENTA   7. Categorías editoriales (cada quien a su camino)
 *  PRUEBA     8. Testimonios en marquee de cards
 *  OFERTA     9. Banda oscura de envío gratis + CTA
 *  DESEO 2   10. Recién llegados (segunda ola de producto)
 *  RIESGO    11. Garantías — reversión de riesgo
 *  OBJECIÓN  12. FAQ acordeón
 *  B2B       13. Banda identidad olfativa empresas
 *  CAPTURA   14. Newsletter (gancho de contenido; sin descuento desde 2026-07-30)
 */
// ISR: la portada se regenera cada 5 min, así el SEO editado en el panel
// admin entra sin necesidad de un deploy.
export const revalidate = 3600

/**
 * SEO de la portada. Por defecto manda el metadata del layout raíz; si la
 * dueña escribió título/descripción en el panel admin (sección SEO), ese texto
 * gana. `title.absolute` evita que se le pegue la plantilla "| Cliché Colombia".
 */
export async function generateMetadata(): Promise<Metadata> {
  const override = await getSeoOverride("/")
  // Canónica explícita: la portada recibe tráfico con ?utm_source=… de los
  // anuncios y sin esto Google puede indexar cada variante como una página
  // distinta. Va también cuando no hay texto personalizado.
  const alternates = { canonical: "/" }
  if (!override.title && !override.description) return { alternates }

  const home = SEO_PAGES[0]
  const title = override.title || home.title
  const description = override.description || home.description
  return {
    title: { absolute: title },
    description,
    alternates,
    openGraph: {
      type: "website",
      locale: "es_CO",
      url: "/",
      siteName: "Cliché Colombia",
      title,
      description,
      images: [
        { url: "/og-image.jpg", width: 1200, height: 630, alt: "Cliché Colombia — Aromas Artesanales Colombianos" },
      ],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og-image.jpg"] },
  }
}

/**
 * Portada propia (7-nov-2026, como Bienestar): foto real de los frascos y el
 * texto en HTML. En false vuelven las diapositivas del panel (EditorialHero).
 */
const PORTADA_PROPIA = true

export default async function Home() {
  // Diapositivas del hero editadas desde el panel (sección Portada); solo se
  // usan si PORTADA_PROPIA está en false.
  const heroOverrides = PORTADA_PROPIA ? null : await getHeroOverrides()

  /*
   * Inicio v2 (7-nov-2026), con el orden del de Bienestar: portada, prueba
   * social, favoritos, "¿Para qué lo buscas?", arma tu kit; después la
   * confianza B2B (logos, segmentos, 3D), razones, garantías, preguntas y la
   * banda para empresas. Salen la banda de atributos, la pausa con texto
   * gigante, la historia editorial y la banda de oferta (repetían lo mismo).
   */
  return (
    <main className="min-h-screen">
      <AnnouncementBar />
      <Header />

      {/* 1. ATENCIÓN — portada propia con foto real (o las del panel) */}
      {PORTADA_PROPIA ? <PortadaCliche /> : <EditorialHero overrides={heroOverrides ?? undefined} />}

      {/* 1b. CONFIANZA INMEDIATA — marcas, envíos y pago protegido */}
      <SocialProofBar />

      {/* 2. DESEO — favoritos en cuadrícula con filtro por familia */}
      <FavoritosInicio />

      {/* 3. CAMINOS — casa, ropa, tienda o marca y regalo */}
      <ParaQueCliche />

      {/* 4. PERSONALIZACIÓN — arma tu propio kit combinando aromas */}
      <CustomPackCTA />

      {/* 5. VALIDACIÓN B2B — logos de marcas reales y segmentos */}
      <BrandLogos />
      <SegmentShowcase />

      {/* 6. OBJETO DE DESEO — vitrina rotativa de renders 3D reales */}
      <ProductShowcase3D />

      {/* (Sin testimonios: no hay forma de verificar que sean reales; se
          ocultan como las reseñas hasta tener varios reales, 7-nov-2026.) */}

      {/* 7. CREENCIA Y RIESGO — razones, garantías y preguntas */}
      <ValuesColumns />
      <Guarantees />
      <Faq />

      {/* 8. B2B — audiencia secundaria, al final del embudo */}
      <ImageTextOverlay
        image="/images/lifestyle-living.jpg"
        eyebrow="Para empresas y marcas"
        title="Creamos la identidad olfativa de tu marca"
        text="Hoteles, spas y tiendas confían en nosotros para diseñar su aroma exclusivo."
        cta={{ label: "Solicitar cotización", href: "/empresas" }}
        align="left"
      />

      {/* 9. CAPTURA — newsletter */}
      <ScrollReveal>
        <EditorialNewsletter />
      </ScrollReveal>

      <Footer />
      <WhatsAppButton />
    </main>
  )
}
