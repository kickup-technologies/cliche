"use client"

import { useRef } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

const ritualProducts = [
  {
    slug: "kit-elementos-x4",
    name: "Kit Elementos x4",
    tagline: "El ritual completo — Agua, Aire, Tierra y Fuego",
    price: "$190.000",
    badge: "Más vendido",
    badgeColor: "bg-primary",
  },
  {
    slug: "aroma-luxury",
    name: "Aroma Luxury",
    tagline: "Experiencia oud árabe en tu hogar",
    price: "$78.000",
    badge: "Premium",
    badgeColor: "bg-amber-600",
  },
  {
    slug: "aroma-eternamente-indigo",
    name: "Aroma Eternamente Índigo",
    tagline: "La fragancia que todos te preguntan",
    price: "$78.000",
    badge: null,
    badgeColor: null,
  },
]

export function RitualUpsell() {
  const scrollRef = useRef<HTMLDivElement>(null)

  function scrollToCard(i: number) {
    if (scrollRef.current) {
      const card = scrollRef.current.children[i] as HTMLElement
      if (card) {
        scrollRef.current.scrollTo({ left: card.offsetLeft - scrollRef.current.offsetLeft, behavior: "smooth" })
      }
    }
  }

  return (
    <section className="py-20 bg-foreground text-background">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-background/50 mb-3">
            Colección destacada
          </p>
          <h2 className="text-3xl lg:text-4xl font-serif font-bold text-background mb-3">
            El ritual completo
          </h2>
          <p className="text-background/60 max-w-md mx-auto text-sm">
            Combina aromas para cada momento del día. Los más elegidos por nuestra comunidad.
          </p>
        </div>

        {/* Mobile carousel */}
        <div className="sm:hidden">
          <div
            ref={scrollRef}
            className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {ritualProducts.map((p) => (
              <Link
                key={p.slug}
                href={`/productos/${p.slug}`}
                className="snap-center flex-shrink-0 w-[80vw] group bg-background/5 border border-background/10 rounded-2xl overflow-hidden hover:bg-background/10 hover:border-background/20 transition-all duration-300"
              >
                <RitualCard p={p} />
              </Link>
            ))}
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-4">
            {ritualProducts.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToCard(i)}
                className="h-2 w-2 rounded-full bg-background/30 hover:bg-background/60 transition-all"
                aria-label={`Ir al producto ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Desktop grid */}
        <div className="hidden sm:grid grid-cols-3 gap-6">
          {ritualProducts.map((p) => (
            <Link
              key={p.slug}
              href={`/productos/${p.slug}`}
              className="group bg-background/5 border border-background/10 rounded-2xl overflow-hidden hover:bg-background/10 hover:border-background/20 transition-all duration-300"
            >
              <RitualCard p={p} />
            </Link>
          ))}
        </div>

        {/* All products CTA */}
        <div className="text-center mt-10">
          <Link
            href="/#productos"
            className="inline-flex items-center gap-2 border border-background/20 text-background/70 hover:text-background hover:border-background/40 text-sm font-medium px-6 py-3 rounded-full transition-colors"
          >
            Ver todos los aromas →
          </Link>
        </div>
      </div>
    </section>
  )
}

function RitualCard({ p }: { p: typeof ritualProducts[0] }) {
  return (
    <>
      {/* Image area */}
      <div className="aspect-square relative overflow-hidden" style={{background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)"}}>
        {p.badge && (
          <span className={`absolute top-3 left-3 z-10 text-xs font-bold text-white px-2.5 py-1 rounded-full ${p.badgeColor}`}>
            {p.badge}
          </span>
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6">
          <div className="w-20 h-20 rounded-full bg-background/10 border border-background/20 flex items-center justify-center">
            <span className="text-background/60 text-2xl font-serif font-bold">C</span>
          </div>
          <p className="text-background/40 text-xs font-medium tracking-widest uppercase">Cliché Aromas</p>
          <p className="text-background/60 text-sm font-semibold text-center leading-snug">{p.tagline}</p>
        </div>
      </div>

      {/* Info */}
      <div className="p-5">
        <h3 className="font-serif font-bold text-background text-base mb-1 group-hover:text-primary transition-colors">
          {p.name}
        </h3>
        <p className="text-xs text-background/60 mb-3 leading-snug">{p.tagline}</p>
        <div className="flex items-center justify-between">
          <span className="font-bold text-background">{p.price} COP</span>
          <span className="text-xs text-primary font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
            Ver producto <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </>
  )
}
