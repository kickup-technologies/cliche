"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ChevronRight, Star, Truck, Shield, Sparkles, ArrowRight } from "lucide-react"

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
  const [currentSlide, setCurrentSlide] = useState(0)
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const [discountPct, setDiscountPct] = useState(10)

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setDiscountPct(d.discount_percentage))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const slideTimer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length)
    }, 6000)

    return () => clearInterval(slideTimer)
  }, [])

  useEffect(() => {
    // Oferta siempre termina esta noche a medianoche — urgencia real y consistente
    const endTime = new Date()
    endTime.setHours(23, 59, 59, 0)

    const tick = () => {
      const diff = endTime.getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 })
        return
      }
      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      })
    }

    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="relative min-h-[100svh] flex flex-col items-center overflow-hidden">
      {/* Background Slides */}
      {heroSlides.map((slide, index) => (
        <div
          key={index}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: currentSlide === index ? 1 : 0 }}
        >
          <Image
            src={slide.image}
            alt={slide.title}
            fill
            className="object-cover"
            priority={index === 0}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
        </div>
      ))}

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10 flex-1 flex items-center">
        <div className="max-w-2xl pt-28 lg:pt-0">
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
          {heroSlides.map((slide, index) => (
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
                  <h1 className="text-3xl sm:text-4xl lg:text-6xl font-serif font-bold text-white mb-4 leading-tight text-balance">
                    {slide.title}
                  </h1>
                  <p className="text-base sm:text-xl md:text-2xl text-white/80 mb-6 sm:mb-8">
                    {slide.subtitle}
                  </p>
                </>
              )}
            </div>
          ))}

          {/* Urgency Timer */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 mb-6 sm:mb-8 inline-block">
            <div className="flex items-center gap-2 sm:gap-3 text-white">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 animate-pulse" />
              <span className="font-medium text-sm sm:text-base">Oferta termina en:</span>
              <div className="flex gap-1.5 sm:gap-2">
                <div className="bg-white/20 px-2 sm:px-3 py-1 rounded-lg text-center">
                  <span className="font-mono font-bold text-base sm:text-xl">{String(timeLeft.hours).padStart(2, "0")}</span>
                  <span className="text-[10px] sm:text-xs block text-white/70">hrs</span>
                </div>
                <span className="text-lg sm:text-2xl font-bold">:</span>
                <div className="bg-white/20 px-2 sm:px-3 py-1 rounded-lg text-center">
                  <span className="font-mono font-bold text-base sm:text-xl">{String(timeLeft.minutes).padStart(2, "0")}</span>
                  <span className="text-[10px] sm:text-xs block text-white/70">min</span>
                </div>
                <span className="text-lg sm:text-2xl font-bold">:</span>
                <div className="bg-white/20 px-2 sm:px-3 py-1 rounded-lg text-center">
                  <span className="font-mono font-bold text-base sm:text-xl">{String(timeLeft.seconds).padStart(2, "0")}</span>
                  <span className="text-[10px] sm:text-xs block text-white/70">seg</span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
            <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 font-semibold group" asChild>
              <a href="#productos">
                COMPRAR CON {discountPct}% OFF
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </a>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 border-white/30 text-white hover:bg-white/10 font-semibold">
              Ver Catálogo
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-white/80 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              <span>Envío gratis +$99.000</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span>Garantía 30 días</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <span>100% Natural</span>
            </div>
          </div>
        </div>
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {heroSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`h-2 rounded-full transition-all ${
              currentSlide === index ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/70"
            }`}
            aria-label={`Ir a slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 right-8 hidden lg:flex flex-col items-center gap-2 text-white/60 text-sm z-10">
        <span className="[writing-mode:vertical-lr]">Scroll</span>
        <div className="w-px h-12 bg-white/30 relative overflow-hidden">
          <div className="w-full h-4 bg-white absolute animate-bounce" />
        </div>
      </div>
    </section>
  )
}
