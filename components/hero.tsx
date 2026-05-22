"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ChevronRight, Star, Truck, Shield, Sparkles, ArrowRight } from "lucide-react"

const heroSlides = [
  {
    image: "/images/hero-main.jpg",
    title: "Transforma tu Hogar en un Santuario",
    subtitle: "Aromas artesanales que despiertan emociones",
    cta: "Ver Colección",
  },
  {
    image: "/images/lifestyle-bedroom.jpg",
    title: "Dulces Sueños, Aromas Únicos",
    subtitle: "Sprays para ropa de cama que transforman tu descanso",
    cta: "Explorar Sprays",
  },
  {
    image: "/images/lifestyle-living.jpg",
    title: "Cada Espacio Cuenta una Historia",
    subtitle: "Difusores y velas premium para ambientes inolvidables",
    cta: "Descubrir Más",
  },
]

export function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [timeLeft, setTimeLeft] = useState({ hours: 1, minutes: 59, seconds: 59 })

  useEffect(() => {
    const slideTimer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length)
    }, 6000)

    return () => clearInterval(slideTimer)
  }, [])

  useEffect(() => {
    const endTime = new Date()
    endTime.setHours(endTime.getHours() + 2)

    const timer = setInterval(() => {
      const now = new Date()
      const diff = endTime.getTime() - now.getTime()

      if (diff <= 0) return

      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000)
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
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
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl">
          {/* Trust Badges */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-white/90 text-sm ml-1">4.9 (2,847 reseñas)</span>
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
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white mb-4 leading-tight text-balance">
                    {slide.title}
                  </h1>
                  <p className="text-xl md:text-2xl text-white/80 mb-8">
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
                <div className="bg-white/20 px-3 py-1 rounded-lg text-center">
                  <span className="font-mono font-bold text-xl">{String(timeLeft.hours).padStart(2, "0")}</span>
                  <span className="text-xs block text-white/70">hrs</span>
                </div>
                <span className="text-2xl font-bold">:</span>
                <div className="bg-white/20 px-3 py-1 rounded-lg text-center">
                  <span className="font-mono font-bold text-xl">{String(timeLeft.minutes).padStart(2, "0")}</span>
                  <span className="text-xs block text-white/70">min</span>
                </div>
                <span className="text-2xl font-bold">:</span>
                <div className="bg-white/20 px-3 py-1 rounded-lg text-center">
                  <span className="font-mono font-bold text-xl">{String(timeLeft.seconds).padStart(2, "0")}</span>
                  <span className="text-xs block text-white/70">seg</span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <Button size="lg" className="text-lg px-8 py-6 font-semibold group">
              COMPRAR CON 30% OFF
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-white/30 text-white hover:bg-white/10 font-semibold">
              Ver Catálogo
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center gap-6 text-white/80 text-sm">
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
