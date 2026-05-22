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

export default function Home() {
  return (
    <main className="min-h-screen">
      <AnnouncementBar />
      <Header />
      <Hero />
      <BrandShowcase />
      <Categories />
      <FeaturedProducts />
      <Benefits />
      <CTASection />
      <Testimonials />
      <Newsletter />
      <Footer />
      
      {/* Urgency & Conversion Elements */}
      <WhatsAppButton />
      <SubscriptionPopup />
      <ExitIntentPopup />
      <SocialProofToast />
      <StickyAddToCart />
    </main>
  )
}
