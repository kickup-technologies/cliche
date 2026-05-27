"use client"

import Image from "next/image"
import { ArrowRight, Sparkles } from "lucide-react"
import Link from "next/link"
import { ScrollAnimation } from "@/components/scroll-animation"

const categories = [
  {
    title: "Aromas para el Hogar",
    description: "Hasta 800 aplicaciones por botella — transforma cada rincón de tu casa",
    image: "/images/product-candle.jpg",
    products: "Para sala, baño y cocina",
    discount: "Ver colección",
    href: "/catalogo?categoria=hogar",
  },
  {
    title: "Sprays Textiles",
    description: "Perfuma tu ropa, camas y muebles con esencias que duran todo el día",
    image: "/images/product-spray.jpg",
    products: "Para ropa y textiles",
    discount: "Ver colección",
    href: "/catalogo?categoria=ropa",
  },
  {
    title: "Kits de Regalo",
    description: "El regalo perfecto — 3 o 4 aromas seleccionados a precio especial",
    image: "/images/product-diffuser.jpg",
    products: "Kits y combos",
    discount: "Ver colección",
    href: "/catalogo?categoria=kit",
  },
]

export function Categories() {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <ScrollAnimation className="text-center max-w-3xl mx-auto mb-12">
          <p className="text-sm uppercase tracking-widest text-primary font-semibold mb-4">
            Categorías
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 text-balance">
            Encuentra el aroma perfecto
          </h2>
          <p className="text-lg text-muted-foreground">
            Explora nuestras colecciones y transforma cualquier espacio
          </p>
        </ScrollAnimation>

        {/* Mobile: horizontal scroll · Desktop: grid 3 cols */}
        <div className="md:hidden flex overflow-x-auto snap-x snap-mandatory gap-4 pb-3 -mx-4 px-4"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {categories.map((category) => (
            <Link
              key={category.title}
              href={category.href}
              className="snap-center flex-shrink-0 w-[78vw] group bg-card rounded-2xl overflow-hidden border border-border/50 active:border-primary/40 transition-all duration-300 block"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image src={category.image} alt={category.title} fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <span className="text-[10px] text-white/70 font-semibold uppercase tracking-wider">{category.products}</span>
                  <h3 className="font-serif text-lg font-bold text-white leading-tight">{category.title}</h3>
                </div>
                <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="p-4">
                <p className="text-xs text-muted-foreground leading-relaxed">{category.description}</p>
                <p className="text-xs font-semibold text-primary mt-2">Ver colección →</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Desktop grid */}
        <div className="hidden md:grid md:grid-cols-3 gap-6">
          {categories.map((category, index) => (
            <ScrollAnimation key={category.title} delay={index * 150}>
              <Link
                href={category.href}
                className="group relative bg-card rounded-2xl overflow-hidden border border-border/50 hover:border-primary/30 transition-all duration-500 hover:shadow-xl block"
              >
                <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm text-[#2D1A14] text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm">
                  <Sparkles className="w-3 h-3 text-[#C4958A]" />
                  {category.products}
                </div>
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image src={category.image} alt={category.title} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <span className="text-xs text-primary font-semibold uppercase tracking-wider">{category.products}</span>
                      <h3 className="font-serif text-xl lg:text-2xl font-bold text-foreground group-hover:text-primary transition-colors">{category.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{category.description}</p>
                    </div>
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors">
                      <ArrowRight className="w-5 h-5 text-primary group-hover:text-primary-foreground transition-colors" />
                    </div>
                  </div>
                </div>
              </Link>
            </ScrollAnimation>
          ))}
        </div>
      </div>
    </section>
  )
}
