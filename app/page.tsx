import { Header } from "@/components/header"
import { AnnouncementBar } from "@/components/announcement-bar"
import { Hero } from "@/components/hero"
import { BrandShowcase } from "@/components/brand-showcase"
import { Categories } from "@/components/categories"
import { FeaturedProducts } from "@/components/featured-products"
import { Benefits } from "@/components/benefits"
import { CTASection } from "@/components/cta-section"
import { Testimonials } from "@/components/testimonials"
import { Newsletter } from "@/components/newsletter"
import { Footer } from "@/components/footer"
import { WhatsAppButton } from "@/components/whatsapp-button"
import { SubscriptionPopup } from "@/components/subscription-popup"
import { ExitIntentPopup } from "@/components/exit-intent-popup"
import { SocialProofToast, StickyAddToCart } from "@/components/urgency-elements"
import { CartDrawer } from "@/components/cart-drawer"
import { HowItWorks } from "@/components/how-it-works"
import { FAQ } from "@/components/faq"
import { UGCSection } from "@/components/ugc-section"
import { RitualUpsell } from "@/components/ritual-upsell"
import { Star, Truck, ShieldCheck, RotateCcw, Users } from "lucide-react"

// Barra de prueba social — refuerza confianza inmediatamente debajo del hero
function SocialProofBar() {
  return (
    <div className="bg-foreground text-background py-3 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="text-background/80">
              <strong className="text-background">4.9</strong> · 2,847 reseñas verificadas
            </span>
          </div>
          <span className="text-background/30 hidden sm:block">|</span>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span className="text-background/80"><strong className="text-background">+5,000</strong> clientes satisfechos</span>
          </div>
          <span className="text-background/30 hidden sm:block">|</span>
          <div className="flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-primary" />
            <span className="text-background/80">Envío gratis en compras <strong className="text-background">+$300k</strong></span>
          </div>
          <span className="text-background/30 hidden md:block">|</span>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span className="text-background/80">Pago 100% seguro</span>
          </div>
          <span className="text-background/30 hidden md:block">|</span>
          <div className="flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5 text-primary" />
            <span className="text-background/80">Garantía 30 días</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* 1. Urgencia inmediata — oferta del día */}
      <AnnouncementBar />

      {/* 2. Navegación */}
      <Header />

      {/* 3. Hero — AIDA: Atención + primera impresión emocional */}
      <Hero />

      {/* 4. Prueba social inmediata — reduce ansiedad post-hero */}
      <SocialProofBar />

      {/* 5. Cómo funciona — elimina fricción antes de ver productos */}
      <HowItWorks />

      {/* 6. Productos primero — el usuario ya quiere comprar */}
      <FeaturedProducts />

      {/* 6. Beneficios — Interés: POR QUÉ Cliché es diferente */}
      <Benefits />

      {/* 7. Testimonios — Deseo: otros ya lo vivieron */}
      <Testimonials />

      {/* 8. UGC / video social — prueba en acción */}
      <UGCSection />

      {/* 9. Categorías — navegación de colección secundaria */}
      <Categories />

      {/* 9. Marcas / asociaciones — credibilidad */}
      <BrandShowcase />

      {/* 10. CTA de conversión — Acción: oferta irresistible */}
      <CTASection />

      {/* 11. FAQ — elimina objeciones finales antes de la captura */}
      <FAQ />

      {/* 12. Ritual upsell — productos complementarios antes del newsletter */}
      <RitualUpsell />

      {/* 13. Captura de email — retención futura */}
      <Newsletter />

      {/* 13. Footer */}
      <Footer />

      {/* ── Elementos de conversión flotantes ── */}
      <CartDrawer />
      <WhatsAppButton />
      <SubscriptionPopup />
      <ExitIntentPopup />
      <SocialProofToast />
      <StickyAddToCart />
    </main>
  )
}
