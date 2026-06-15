import { Header } from "@/components/header"
import { AnnouncementBar } from "@/components/announcement-bar"
import { Footer } from "@/components/footer"
import { WhatsAppButton } from "@/components/whatsapp-button"

// ── Capa editorial (estructura estilo renesmehair, marca Cliché) ──
import { IntroOverlay } from "@/components/editorial/intro-overlay"
import { EditorialHero } from "@/components/editorial/editorial-hero"
import { Marquee } from "@/components/editorial/marquee"
import { ProductCollection } from "@/components/editorial/product-collection"
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
import { StarShowcase } from "@/components/editorial/star-showcase"

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
 *  CAPTURA   14. Newsletter con gancho de 10% off
 */
export default function Home() {
  return (
    <main className="min-h-screen">
      <IntroOverlay />
      <AnnouncementBar />
      <Header />

      {/* 1. ATENCIÓN — hero con CTA y confianza inmediata */}
      <EditorialHero />

      {/* 2. CONFIANZA — atributos de marca en movimiento */}
      <ScrollReveal>
        <Marquee />
      </ScrollReveal>

      {/* 3. DESEO — exposición de aromas estrella (carrusel sobre disco) */}
      <ScrollReveal>
        <StarShowcase />
      </ScrollReveal>

      {/* 3b. SEGMENTACIÓN B2B — un aroma para cada tipo de marca */}
      <SegmentShowcase />

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

      {/* 6b. OBJETO DE DESEO — el frasco renderizado en 3D vivo */}
      <ProductShowcase3D />

      {/* 7. SEGMENTACIÓN — cada visitante a su camino (stagger interno) */}
      <EditorialStory />

      {/* 8. PRUEBA SOCIAL — testimonios en marquee de cards */}
      <Testimonials />

      {/* 9. OFERTA — incentivo concreto con CTA único */}
      <OfferBand />

      {/* 10. DESEO 2 — segunda ola de producto, sin repetir */}
      <ScrollReveal>
        <ProductCollection
          eyebrow="Recién llegados"
          title="Nuevos en la colección"
          limit={4}
          offset={8}
          ctaLabel="Explorar colección"
          ctaHref="/catalogo"
        />
      </ScrollReveal>

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
