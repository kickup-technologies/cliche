"use client"

import Image from "next/image"
import { ArrowRight, Sparkles } from "lucide-react"
import Link from "next/link"
import { ScrollAnimation } from "@/components/scroll-animation"

const categories = [
  {
    title: "Velas Artesanales",
    description: "Hasta 50 horas de duración con aromas que transforman tu espacio",
    image: "/images/product-candle.jpg",
    products: "24 productos",
    discount: "25% OFF",
    href: "#velas",
  },
  {
    title: "Sprays Textiles",
    description: "Perfuma tu ropa, camas y muebles con esencias duraderas",
    image: "/images/product-spray.jpg",
    products: "18 productos",
    discount: "30% OFF",
    href: "#sprays",
  },
  {
    title: "Difusores Premium",
    description: "Ambientes frescos y aromáticos las 24 horas del día",
    image: "/images/product-diffuser.jpg",
    products: "12 productos",
    discount: "20% OFF",
    href: "#difusores",
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

        {/* Categories grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {categories.map((category, index) => (
            <ScrollAnimation key={category.title} delay={index * 150}>
              <Link
                href={category.href}
                className="group relative bg-card rounded-2xl overflow-hidden border border-border/50 hover:border-primary/30 transition-all duration-500 hover:shadow-xl block"
              >
                {/* Discount Badge */}
                <div className="absolute top-4 left-4 z-10 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {category.discount}
                </div>

                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={category.image}
                    alt={category.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <span className="text-xs text-primary font-semibold uppercase tracking-wider">
                        {category.products}
                      </span>
                      <h3 className="font-serif text-xl lg:text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                        {category.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {category.description}
                      </p>
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
