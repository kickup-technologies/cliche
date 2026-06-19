"use client"

import { ScrollReveal } from "@/components/editorial/scroll-reveal"

/**
 * BrandLogos — social proof B2B: marcas que ya trabajan con Cliché y tienen su
 * aroma propio. Tira de logotipos uniformados (grayscale + opacidad, color al
 * hover). Logos oficiales tomados de clichecolombia.com.
 */
const BRANDS = [
  { src: "/images/brands/agua-bendita.webp", alt: "Agua Bendita" },
  { src: "/images/brands/seven-seven.webp", alt: "Seven Seven" },
  { src: "/images/brands/entreaguas.webp", alt: "Entreaguas" },
  { src: "/images/brands/clemont.webp", alt: "Clemont" },
  { src: "/images/brands/wild-and-pacific.webp", alt: "Wild & Pacific" },
  { src: "/images/brands/action-wear.webp", alt: "Action Wear" },
  { src: "/images/brands/ancora.png", alt: "Áncora" },
]

export function BrandLogos() {
  return (
    <section className="border-y border-border/60 bg-background py-14 md:py-20">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <p className="mb-10 text-center text-lg font-semibold tracking-tight text-primary md:mb-14 md:text-2xl">
            Marcas que ya tienen su aroma propio
          </p>
        </ScrollReveal>
        <div className="flex flex-wrap items-center justify-center gap-x-9 gap-y-8 md:gap-x-14 lg:gap-x-16">
          {BRANDS.map((b, i) => (
            <ScrollReveal key={b.src} delay={i * 70}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.src}
                alt={b.alt}
                loading="lazy"
                className="h-6 w-auto max-w-[120px] object-contain opacity-55 grayscale transition-all duration-500 hover:opacity-100 hover:grayscale-0 md:h-9 md:max-w-[150px]"
              />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
