"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ChevronRight, Star, Truck, Shield, Sparkles, ArrowRight } from "lucide-react"
import { useSiteSettings } from "@/lib/use-site-settings"

// Tiempo restante hasta medianoche de hoy. Se calcula al instante para que el
// contador nunca aparezca en 00:00:00 durante el primer render.
function timeUntilMidnight() {
  const end = new Date()
  end.setHours(23, 59, 59, 0)
  const diff = end.getTime() - Date.now()
  if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0 }
  return {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  }
}

const heroSlides = [
  {
    image: "/images/hero-main.jpg",
    title: "Tu hogar oliendo a spa en 3 segundos",
    subtitle: "Sin velas. Sin enchufes. Sin riesgo. Solo unos pufs duran todo el día en textiles — 100% natural, no mancha, no irrita.",
    cta: "Descubrir mi aroma →",
  },
  {
    image: "/images/lifestyle-bedroom.jpg",
    title: "Duerme rodeado del aroma que eliges tú",
    subtitle: "Aplica 3 pufs en tus sábanas y la fragancia permanece toda la noche. Fórmula sin aceites — no mancha tela blanca.",
    cta: "Ver aromas para dormitorio →",
  },
  {
    image: "/images/lifestyle-living.jpg",
    title: "El aroma que todos te preguntan cuando entran",
    subtitle: "Más de 5.000 hogares colombianos ya tienen su firma olfativa. Una botella rinde 800 aplicaciones — 6 meses de uso.",
    cta: "Elegir mi fragancia →",
  },
]

export function Hero() {
  const settings = useSiteSettings()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [timeLeft, setTimeLeft] = useState(timeUntilMidnight)
  const discountPct = settings.discount_percentage ?? 10

  // El admin puede sobreescribir el título/subtítulo del primer slide y
  // reemplazar las imágenes del carrusel desde el Editor Visual. Se recalcula
  // cuando cambian los settings (incluida la previsualización en vivo).
  const slides = (() => {
    const next = heroSlides.map((s) => ({ ...s }))
    if (settings.hero_title) next[0].title = settings.hero_title
    if (settings.hero_subtitle) next[0].subtitle = settings.hero_subtitle
    if (Array.isArray(settings.hero_slides) && settings.hero_slides.length > 0) {
      settings.hero_slides.forEach((img, i) => {
        if (!img) return
        if (next[i]) next[i].image = img
        else next.push({ image: img, title: next[0].title, subtitle: next[0].subtitle, cta: next[0].cta })
      })
    }
    return next
  })()

  useEffect(() => {
    const slideTimer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 6000)

    return () => clearInterval(slideTimer)
  }, [slides.length])

  useEffect(() => {
    // Oferta siempre termina esta noche a medianoche — urgencia real y consistente
    setTimeLeft(timeUntilMidnight())
    const timer = setInterval(() => setTimeLeft(timeUntilMidnight()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section
      className="relative flex flex-col items-center overflow-hidden min-h-[72svh] lg:min-h-[100svh]"
      data-cliche-edit="hero_slides"
      data-cliche-label="Imágenes del hero"
    >

      {/* Background Slides */}
      {slides.map((slide, index) => (
        <div
          key={index}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: currentSlide === index ? 1 : 0 }}
        >
          <Image
            src={slide.image}
            alt={slide.title}
            fill
            className="object-cover object-top"
            priority={index === 0}
          />
          {/* gradiente más fuerte abajo para legibilidad del CTA en móvil */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/75 lg:bg-gradient-to-r lg:from-black/70 lg:via-black/40 lg:to-transparent" />
        </div>
      ))}

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10 flex-1 flex items-end lg:items-center pb-8 lg:pb-0">
        <div className="w-full max-w-2xl pt-20 lg:pt-28">

          {/* ── MÓVIL: layout compacto de conversión ── */}
          <div className="lg:hidden">
            {/* Rating pill */}
            <div className="flex items-center gap-1.5 mb-3">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-white/80 text-xs">+5.000 hogares felices</span>
            </div>

            {/* Título — solo el del slide actual */}
            <h1
              className="text-2xl font-serif font-bold text-white mb-2 leading-tight"
              data-cliche-edit="hero_title"
              data-cliche-label="Título del hero"
            >
              {slides[currentSlide].title}
            </h1>

            {/* Urgency strip compacto */}
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
              <span className="text-white/70 text-xs">Oferta termina en:</span>
              <span className="font-mono font-bold text-white text-sm" suppressHydrationWarning>
                {String(timeLeft.hours).padStart(2,"0")}:{String(timeLeft.minutes).padStart(2,"0")}:{String(timeLeft.seconds).padStart(2,"0")}
              </span>
            </div>

            {/* CTA principal — grande, full-width */}
            <Button size="lg" className="w-full py-5 text-base font-bold tracking-wide group mb-3" asChild>
              <a href="#productos">
                COMPRAR CON {discountPct}% OFF
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </a>
            </Button>

            {/* Trust mínimo */}
            <div className="flex items-center justify-center gap-4 text-white/60 text-[11px]">
              <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Envío gratis +$300k</span>
              <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Garantía 30d</span>
            </div>
          </div>

          {/* ── DESKTOP: layout original completo ── */}
          <div className="hidden lg:block">
            {/* Trust Badges */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <span className="text-white/90 text-sm ml-1">+5.000 hogares felices</span>
              </div>
            </div>

            {/* Title with Animation */}
            {slides.map((slide, index) => (
              <div
                key={index}
                className="transition-all duration-700"
                style={{
                  opacity: currentSlide === index ? 1 : 0,
                  transform: currentSlide === index ? "translateY(0)" : "translateY(20px)",
                  position: currentSlide === index ? "relative" : "absolute",
                }}
              >
                {currentSlide === index && (
                  <>
                    <h1
                      className="text-4xl lg:text-6xl font-serif font-bold text-white mb-4 leading-tight text-balance"
                      data-cliche-edit="hero_title"
                      data-cliche-label="Título del hero"
                    >
                      {slide.title}
                    </h1>
                    <p
                      className="text-xl md:text-2xl text-white/80 mb-8"
                      data-cliche-edit="hero_subtitle"
                      data-cliche-label="Subtítulo del hero"
                    >
                      {slide.subtitle}
                    </p>
                  </>
                )}
              </div>
            ))}

            {/* Urgency Timer */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-8 inline-block">
              <div className="flex items-center gap-3 text-white">
                <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                <span className="font-medium">Oferta termina en:</span>
                <div className="flex gap-2">
                  {[
                    { v: timeLeft.hours, l: "hrs" },
                    { v: timeLeft.minutes, l: "min" },
                    { v: timeLeft.seconds, l: "seg" },
                  ].map(({ v, l }, i) => (
                    <div key={l} className="flex items-center gap-2">
                      {i > 0 && <span className="text-2xl font-bold">:</span>}
                      <div className="bg-white/20 px-3 py-1 rounded-lg text-center">
                        <span className="font-mono font-bold text-xl" suppressHydrationWarning>{String(v).padStart(2,"0")}</span>
                        <span className="text-xs block text-white/70">{l}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex gap-4 mb-8">
              <Button size="lg" className="text-lg px-8 py-6 font-semibold group" asChild>
                <a href="#productos">
                  COMPRAR CON {discountPct}% OFF
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-white/30 text-white hover:bg-white/10 font-semibold" asChild>
                <a href="#productos">
                  Ver Catálogo
                  <ChevronRight className="w-5 h-5 ml-1" />
                </a>
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center gap-6 text-white/80 text-sm">
              <div className="flex items-center gap-2"><Truck className="w-5 h-5" /><span>Envío gratis +$300.000</span></div>
              <div className="flex items-center gap-2"><Shield className="w-5 h-5" /><span>Garantía 30 días</span></div>
              <div className="flex items-center gap-2"><Sparkles className="w-5 h-5" /><span>100% Natural</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-4 lg:bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`h-1.5 rounded-full transition-all ${
              currentSlide === index ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"
            }`}
            aria-label={`Ir a slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Scroll Indicator — solo desktop */}
      <div className="absolute bottom-8 right-8 hidden lg:flex flex-col items-center gap-2 text-white/60 text-sm z-10">
        <span className="[writing-mode:vertical-lr]">Scroll</span>
        <div className="w-px h-12 bg-white/30 relative overflow-hidden">
          <div className="w-full h-4 bg-white absolute animate-bounce" />
        </div>
      </div>
    </section>
  )
}
