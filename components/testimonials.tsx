"use client"

import { Quote, Star, ChevronLeft, ChevronRight, ShieldCheck, Verified } from "lucide-react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ScrollAnimation } from "@/components/scroll-animation"

const testimonials = [
  {
    id: 1,
    name: "María Fernanda López",
    role: "Diseñadora de Interiores",
    location: "Bogotá",
    content: "Los aromas de Cliché transformaron por completo la experiencia de mis clientes. Cada espacio cobra vida con estas fragancias únicas. Es mi marca favorita para proyectos premium.",
    rating: 5,
    verified: true,
    product: "Kit Aromas del Hogar",
  },
  {
    id: 2,
    name: "Carlos Andrés Mejía",
    role: "Gerente de Hotel Boutique",
    location: "Medellín",
    content: "Nuestros huéspedes siempre preguntan qué aroma usamos. Cliché nos ayudó a crear una identidad olfativa única que nos diferencia de la competencia.",
    rating: 5,
    verified: true,
    product: "Aroma Personalizado",
  },
  {
    id: 3,
    name: "Paola Restrepo",
    role: "Propietaria de Spa",
    location: "Cali",
    content: "La calidad de los productos es excepcional. Mis clientes se sienten transportados a un oasis de tranquilidad desde el momento que entran. 100% recomendado.",
    rating: 5,
    verified: true,
    product: "Difusor Dulce Lana",
  },
]

export function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  useEffect(() => {
    if (!isAutoPlaying) return
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [isAutoPlaying])

  const nextTestimonial = () => {
    setIsAutoPlaying(false)
    setCurrentIndex((prev) => (prev + 1) % testimonials.length)
  }

  const prevTestimonial = () => {
    setIsAutoPlaying(false)
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  return (
    <section className="py-20 bg-foreground text-background overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Content */}
          <ScrollAnimation direction="left">
            <div className="space-y-8">
              <div className="space-y-4">
                <p className="text-sm uppercase tracking-widest text-primary font-semibold">
                  Testimonios
                </p>
                <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-balance text-shimmer-light">
                  +2,847 clientes felices
                </h2>
                <p className="text-lg text-background/70 leading-relaxed max-w-lg">
                  Únete a miles de personas que ya transformaron sus espacios con Cliché
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 py-8 border-t border-b border-background/10">
                <div>
                  <p className="text-3xl lg:text-4xl font-bold text-primary">4.9</p>
                  <div className="flex items-center gap-1 mt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-xs text-background/60 mt-1">Google Reviews</p>
                </div>
                <div>
                  <p className="text-3xl lg:text-4xl font-bold text-primary">2.8k+</p>
                  <p className="text-xs text-background/60 mt-1">Reseñas</p>
                </div>
                <div>
                  <p className="text-3xl lg:text-4xl font-bold text-primary">98%</p>
                  <p className="text-xs text-background/60 mt-1">Recomprarían</p>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full border-background/20 text-background hover:bg-background hover:text-foreground"
                  onClick={prevTestimonial}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full border-background/20 text-background hover:bg-background hover:text-foreground"
                  onClick={nextTestimonial}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
                <div className="flex gap-2 ml-4">
                  {testimonials.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setIsAutoPlaying(false)
                        setCurrentIndex(i)
                      }}
                      className={cn(
                        "h-2 rounded-full transition-all",
                        currentIndex === i ? "w-8 bg-primary" : "w-2 bg-background/30"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          </ScrollAnimation>

          {/* Right side - Testimonial card */}
          <ScrollAnimation direction="right">
            <div className="relative">
              <div className="relative bg-background/5 backdrop-blur-sm rounded-2xl p-8 border border-background/10">
                <Quote className="w-10 h-10 text-primary/40 mb-4" />
                
                {/* Rating & Verified */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-5 w-5",
                          i < testimonials[currentIndex].rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "fill-background/20 text-background/20"
                        )}
                      />
                    ))}
                  </div>
                  {testimonials[currentIndex].verified && (
                    <div className="flex items-center gap-1 text-green-400 text-sm">
                      <Verified className="w-4 h-4" />
                      <span>Compra verificada</span>
                    </div>
                  )}
                </div>

                <p className="text-xl lg:text-2xl font-serif leading-relaxed mb-6">
                  {`"${testimonials[currentIndex].content}"`}
                </p>

                {/* Product bought */}
                <div className="bg-background/10 rounded-lg p-3 mb-6">
                  <p className="text-sm text-background/70">
                    Compró: <span className="font-semibold text-background">{testimonials[currentIndex].product}</span>
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/30 flex items-center justify-center text-xl font-bold">
                    {testimonials[currentIndex].name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-background">
                      {testimonials[currentIndex].name}
                    </p>
                    <p className="text-sm text-background/60">
                      {testimonials[currentIndex].role} - {testimonials[currentIndex].location}
                    </p>
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
