"use client"

import { useEffect, useRef } from "react"
import { ScrollAnimation } from "@/components/scroll-animation"

const brands = [
  { name: "SEVENSEVEN", logo: "SEVENSEVEN" },
  { name: "Entreaguas", logo: "Entreaguas" },
  { name: "Clemont", logo: "Clemont" },
  { name: "Wild & Pacific", logo: "WILD & PACIFIC" },
  { name: "AW", logo: "AW" },
  { name: "Arturo Calle", logo: "ARTURO CALLE" },
  { name: "Studio F", logo: "STUDIO F" },
  { name: "Vélez", logo: "VÉLEZ" },
]

export function BrandShowcase() {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scrollContainer = scrollRef.current
    if (!scrollContainer) return

    let animationId: number
    let scrollPosition = 0

    const scroll = () => {
      scrollPosition += 0.5
      if (scrollPosition >= scrollContainer.scrollWidth / 2) {
        scrollPosition = 0
      }
      scrollContainer.scrollLeft = scrollPosition
      animationId = requestAnimationFrame(scroll)
    }

    animationId = requestAnimationFrame(scroll)

    return () => cancelAnimationFrame(animationId)
  }, [])

  return (
    <section className="py-12 bg-secondary/30 border-y border-border/50 overflow-hidden">
      <div className="container mx-auto px-4">
        <ScrollAnimation className="text-center mb-8">
          <p className="text-sm uppercase tracking-widest text-primary font-semibold">
            +500 Marcas Confían en Nosotros
          </p>
        </ScrollAnimation>

        <div 
          ref={scrollRef}
          className="flex items-center gap-12 lg:gap-20 overflow-x-hidden"
          style={{ scrollBehavior: "auto" }}
        >
          {/* Double the brands for seamless loop */}
          {[...brands, ...brands].map((brand, index) => (
            <div
              key={`${brand.name}-${index}`}
              className="flex-shrink-0 text-muted-foreground/50 hover:text-foreground transition-colors duration-300 cursor-pointer"
            >
              <span className="font-serif text-xl lg:text-2xl font-semibold tracking-wide whitespace-nowrap">
                {brand.logo}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
