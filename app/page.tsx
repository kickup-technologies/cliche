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
import { EditorialNewsletter } from "@/components/editorial/editorial-newsletter"
import { ScrollReveal } from "@/components/editorial/scroll-reveal"
import { FavoritosInicio } from "@/components/favoritos-inicio"
import { FamiliasCliche, GarantiasCliche, KitsCliche, ParaQueCliche, PortadaCliche } from "@/components/inicio-cliche"
import { Faq } from "@/components/editorial/faq"
import { BrandLogos } from "@/components/editorial/brand-logos"
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
   * Inicio v3 (7-nov-2026): el producto primero y todo a la vista, como las
   * tiendas que mejor venden. Portada, beneficios, favoritos, compra por
   * familia, para qué lo buscas, kits con su precio, marcas que ya lo usan,
   * garantías en una fila, preguntas y la banda para empresas. Salen las
   * secciones largas que se llenaban al deslizar (segmentos de 4.000 px,
   * garantías de 3.600 px, el visor 3D y los valores).
   */
  return (
    <main className="min-h-screen">
      <AnnouncementBar />
      <Header />

      {/* 1. ATENCIÓN — portada propia con foto real (o las del panel) */}
      {PORTADA_PROPIA ? <PortadaCliche /> : <EditorialHero overrides={heroOverrides ?? undefined} />}

      {/* 2. CONFIANZA INMEDIATA — marcas, envíos y pago protegido */}
      <SocialProofBar />

      {/* 3. DESEO — favoritos en cuadrícula con filtro por familia */}
      <FavoritosInicio />

      {/* 4. CAMINOS — por familia olfativa y por uso */}
      <FamiliasCliche />
      <ParaQueCliche />

      {/* 5. OFERTA — kits con su precio real y lo que se ahorra */}
      <KitsCliche />

      {/* 6. PRUEBA — marcas que ya tienen su aroma (logos reales) */}
      <BrandLogos />

      {/* 7. RIESGO — garantías en una fila y preguntas frecuentes */}
      <GarantiasCliche />
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
