import type { Metadata } from "next"
import { getSeoOverride, SEO_PAGES } from "@/lib/seo"
import { Header } from "@/components/header"
import { AnnouncementBar } from "@/components/announcement-bar"
import { Footer } from "@/components/footer"
import { WhatsAppButton } from "@/components/whatsapp-button"

// ── Capa editorial (estructura estilo renesmehair, marca Cliché) ──
import { EditorialHero } from "@/components/editorial/editorial-hero"
import { Marquee } from "@/components/editorial/marquee"
import { EditorialStory } from "@/components/editorial/editorial-story"
import { ImageTextOverlay } from "@/components/editorial/image-text-overlay"
import { ValuesColumns } from "@/components/editorial/values-columns"
import { EditorialNewsletter } from "@/components/editorial/editorial-newsletter"
import { ScrollReveal } from "@/components/editorial/scroll-reveal"
import { BigTextScroll } from "@/components/editorial/big-text-scroll"
import { Testimonials } from "@/components/editorial/testimonials"
import { OfferBand } from "@/components/editorial/offer-band"
import { Guarantees } from "@/components/editorial/guarantees"
import { Faq } from "@/components/editorial/faq"
import { ProductShowcase3D } from "@/components/editorial/product-showcase-3d"
import { SegmentShowcase } from "@/components/editorial/segment-showcase"
import { BrandLogos } from "@/components/editorial/brand-logos"
import { CustomPackCTA } from "@/components/editorial/custom-pack-cta"

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
export const revalidate = 300

/**
 * SEO de la portada. Por defecto manda el metadata del layout raíz; si la
 * dueña escribió título/descripción en el panel admin (sección SEO), ese texto
 * gana. `title.absolute` evita que se le pegue la plantilla "| Cliché Colombia".
 */
export async function generateMetadata(): Promise<Metadata> {
  const override = await getSeoOverride("/")
  if (!override.title && !override.description) return {}

  const home = SEO_PAGES[0]
  const title = override.title || home.title
  const description = override.description || home.description
  return {
    title: { absolute: title },
    description,
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

export default function Home() {
  return (
    <main className="min-h-screen">
      <AnnouncementBar />
      <Header />

      {/* 1. ATENCIÓN — hero con CTA y confianza inmediata */}
      <EditorialHero />

      {/* 2. CONFIANZA — atributos de marca en movimiento */}
      <ScrollReveal>
        <Marquee />
      </ScrollReveal>

      {/* 3. SEGMENTACIÓN B2B — categorías (layout original + "ver más") */}
      <SegmentShowcase />

      {/* 3b. OBJETO DE DESEO — vitrina rotativa de renders 3D reales */}
      <ProductShowcase3D />

      {/* 3c. PERSONALIZACIÓN — arma tu propio kit combinando aromas */}
      <CustomPackCTA />

      {/* 4. CREENCIA — razones para confiar (stagger interno) */}
      <ValuesColumns />

      {/* 5. EMOCIÓN — banda full-bleed con parallax */}
      <ImageTextOverlay
        image="/images/lifestyle-bedroom.jpg"
        eyebrow="Experiencia de marca"
        title="El aroma que hace que quieran quedarse"
        text="Un ambiente que enamora a tus clientes desde que entran. Unos pufs duran todo el día —100% natural, no mancha."
        cta={{ label: "Ver aromas", href: "/catalogo" }}
        height="tall"
      />

      {/* 6. Pausa editorial — titular gigante sobre humo WebGL */}
      <BigTextScroll text="Aromas que transforman marcas" />

      {/* 7. SEGMENTACIÓN — cada visitante a su camino (stagger interno) */}
      <EditorialStory />

      {/* 8. PRUEBA SOCIAL — testimonios en marquee de cards */}
      <Testimonials />

      {/* 8b. PRUEBA SOCIAL — marcas que ya tienen su aroma propio (loop) */}
      <BrandLogos />

      {/* 9. OFERTA — incentivo concreto con CTA único */}
      <OfferBand />

      {/* 11. REVERSIÓN DE RIESGO — garantías concretas */}
      <Guarantees />

      {/* 12. OBJECIONES — FAQ acordeón */}
      <Faq />

      {/* 13. B2B — audiencia secundaria, al final del embudo */}
      <ImageTextOverlay
        image="/images/lifestyle-living.jpg"
        eyebrow="Para empresas y marcas"
        title="Creamos la identidad olfativa de tu marca"
        text="Hoteles, spas y tiendas confían en nosotros para diseñar su aroma exclusivo."
        cta={{ label: "Solicitar cotización", href: "/catalogo" }}
        align="left"
      />

      {/* 14. CAPTURA — último intento con gancho de descuento */}
      <ScrollReveal>
        <EditorialNewsletter />
      </ScrollReveal>

      <Footer />
      <WhatsAppButton />
    </main>
  )
}
