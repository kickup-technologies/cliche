import { Header } from "@/components/header"
import { AnnouncementBar } from "@/components/announcement-bar"
import { Footer } from "@/components/footer"
import { WhatsAppButton } from "@/components/whatsapp-button"

// ── Capa editorial (estructura estilo renesmehair, marca Cliché) ──
import { EditorialHero } from "@/components/editorial/editorial-hero"
import { Marquee } from "@/components/editorial/marquee"
import { ProductCollection } from "@/components/editorial/product-collection"
import { EditorialStory } from "@/components/editorial/editorial-story"
import { ImageTextOverlay } from "@/components/editorial/image-text-overlay"
import { ValuesColumns } from "@/components/editorial/values-columns"
import { EditorialNewsletter } from "@/components/editorial/editorial-newsletter"

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Barra de anuncio fina + navegación (altura compacta actual) */}
      <AnnouncementBar />
      <Header />

      {/* 1. Hero slideshow fotográfico full-bleed */}
      <EditorialHero />

      {/* 2. Banda marquee de atributos de marca */}
      <Marquee />

      {/* 3. Colección de productos — recién llegados */}
      <ProductCollection
        eyebrow="Recién llegados"
        title="Nuestros aromas"
        limit={8}
        ctaLabel="Ver todos los aromas"
        ctaHref="/catalogo"
      />

      {/* 4. Historias / categorías editoriales (3 columnas) */}
      <EditorialStory />

      {/* 5. Banda full-bleed con texto superpuesto */}
      <ImageTextOverlay
        image="/images/lifestyle-bedroom.jpg"
        eyebrow="Rituales diarios"
        title="Tu hogar oliendo a spa en 3 segundos"
        text="Unos pufs duran todo el día. 100% natural, no mancha, no irrita."
        cta={{ label: "Comprar ahora", href: "/catalogo" }}
        height="tall"
      />

      {/* 6. Más productos — favoritos de la comunidad */}
      <ProductCollection
        eyebrow="Los favoritos"
        title="Los que todas quieren"
        limit={4}
        ctaLabel="Explorar colección"
        ctaHref="/catalogo"
      />

      {/* 7. Valores de marca */}
      <ValuesColumns />

      {/* 8. Banda editorial — propuesta B2B */}
      <ImageTextOverlay
        image="/images/lifestyle-living.jpg"
        eyebrow="Para empresas y marcas"
        title="Creamos la identidad olfativa de tu marca"
        text="Hoteles, spas y tiendas confían en nosotros para diseñar su aroma exclusivo."
        cta={{ label: "Solicitar cotización", href: "/catalogo" }}
        align="left"
      />

      {/* 9. Newsletter minimal */}
      <EditorialNewsletter />

      {/* 10. Footer */}
      <Footer />

      {/* Flotante de soporte */}
      <WhatsAppButton />
    </main>
  )
}
