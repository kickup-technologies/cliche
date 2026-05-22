"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Leaf, Flag, Star, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const trustBadges = [
    { icon: Leaf, text: "100% Natural" },
    { icon: Flag, text: "Hecho en Colombia" },
    { icon: Star, text: "Clientes satisfechos" },
    { icon: Truck, text: "Envio rapido" },
  ]

  return (
    <section ref={heroRef} className="relative bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Text Content */}
          <div className={cn(
            "space-y-6 transition-all duration-700 ease-out",
            isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10"
          )}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground leading-tight text-balance">
              Aromas que transforman tu espacio{" "}
              <span className="text-primary">— y tu bienestar.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
              Difusores, esencias y kits de aromaterapia 100% naturales. 
              Fabricados en Colombia, pensados para tu calidad de vida.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button 
                size="lg" 
                className="rounded-full px-8 text-base font-semibold h-12"
                asChild
              >
                <Link href="#productos">
                  Explorar productos
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="rounded-full px-8 text-base font-semibold h-12 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                asChild
              >
                <Link href="#kits">
                  Ver kits
                </Link>
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-4 pt-6">
              {trustBadges.map((badge, index) => (
                <div 
                  key={badge.text}
                  className={cn(
                    "flex items-center gap-2 text-sm text-muted-foreground transition-all duration-500",
                    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  )}
                  style={{ transitionDelay: `${(index + 1) * 100 + 400}ms` }}
                >
                  <badge.icon className="w-4 h-4 text-primary" />
                  <span>{badge.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Image */}
          <div className={cn(
            "relative transition-all duration-700 ease-out delay-200",
            isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10"
          )}>
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-muted">
              <Image
                src="/images/hero-aromatherapy.jpg"
                alt="Productos de aromaterapia Bienestar by Cliche"
                fill
                className="object-cover"
                priority
              />
              {/* Floating badge */}
              <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Star className="w-6 h-6 text-primary fill-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">4.8/5</p>
                    <p className="text-xs text-muted-foreground">+500 clientes felices</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
