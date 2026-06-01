"use client"

import Image from "next/image"
import { ArrowRight, Check, Users, Award, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollAnimation } from "@/components/scroll-animation"
import { useSiteSettings } from "@/lib/use-site-settings"

export function CTASection() {
  const settings = useSiteSettings()
  const ctaTitle = settings.cta_title || "¿Tienes una marca? Creamos tu identidad olfativa"
  const ctaSubtitle =
    settings.cta_subtitle ||
    "Diseñamos aromas exclusivos para negocios que quieren diferenciarse. Hoteles, spas, tiendas y marcas deportivas ya confían en nosotros."
  return (
    <section className="py-20 bg-secondary/50 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <ScrollAnimation direction="left">
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold">
                  <Users className="w-4 h-4" />
                  Para Empresas y Marcas
                </div>
                <h2
                  data-cliche-edit="cta_title"
                  data-cliche-label="Título empresas"
                  className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-shimmer text-balance"
                >
                  {ctaTitle}
                </h2>
                <p
                  data-cliche-edit="cta_subtitle"
                  data-cliche-label="Subtítulo empresas"
                  className="text-lg text-muted-foreground leading-relaxed max-w-lg"
                >
                  {ctaSubtitle}
                </p>
              </div>

              <ul className="space-y-4">
                {[
                  "Fragancia exclusiva diseñada para tu marca",
                  "Asesoría personalizada en marketing olfativo",
                  "Producción escalable para cualquier volumen",
                  "Packaging personalizado con tu branding",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>

              {/* Stats */}
              <div className="flex items-center gap-8 py-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">500+</p>
                  <p className="text-sm text-muted-foreground">Marcas Aliadas</p>
                </div>
                <div className="h-12 w-px bg-border" />
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">98%</p>
                  <p className="text-sm text-muted-foreground">Satisfacción</p>
                </div>
                <div className="h-12 w-px bg-border" />
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">5 años</p>
                  <p className="text-sm text-muted-foreground">Experiencia</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="px-8 py-6 text-base rounded-full group"
                >
                  Solicitar Cotización Gratis
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="border-primary/30 text-foreground hover:bg-primary/5 px-8 py-6 text-base rounded-full"
                >
                  <Award className="w-5 h-5 mr-2" />
                  Ver Casos de Éxito
                </Button>
              </div>
            </div>
          </ScrollAnimation>

          {/* Image grid */}
          <ScrollAnimation direction="right">
            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="aspect-[3/4] rounded-2xl overflow-hidden">
                    <Image
                      src="/images/lifestyle-living.jpg"
                      alt="Productos Cliché personalizados"
                      width={300}
                      height={400}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="aspect-square rounded-2xl overflow-hidden bg-primary text-primary-foreground flex items-center justify-center">
                    <div className="text-center p-6">
                      <Sparkles className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-3xl font-bold">500+</p>
                      <p className="text-sm opacity-90 mt-1">Marcas Aliadas</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4 pt-8">
                  <div className="aspect-square rounded-2xl overflow-hidden">
                    <Image
                      src="/images/product-kit.jpg"
                      alt="Kit de productos Cliché"
                      width={300}
                      height={300}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="aspect-[3/4] rounded-2xl overflow-hidden">
                    <Image
                      src="/images/lifestyle-bedroom.jpg"
                      alt="Ambiente con productos Cliché"
                      width={300}
                      height={400}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-card rounded-xl p-4 shadow-xl border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Cotización sin compromiso</p>
                    <p className="text-sm text-muted-foreground">Respuesta en 24 horas</p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollAnimation>
        </div>
      </div>
    </section>
  )
}
