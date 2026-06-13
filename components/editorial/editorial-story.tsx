import Image from "next/image"
import Link from "next/link"
import { ScrollReveal } from "@/components/editorial/scroll-reveal"
import { SplitText } from "@/components/editorial/split-text"

/**
 * EditorialStory — media grid de 3 columnas (estilo renesme "Coleccionar historias").
 * Tres tarjetas editoriales con imagen vertical + caption + enlace.
 */
interface StoryCard {
  image: string
  caption: string
  href: string
}

const CARDS: StoryCard[] = [
  { image: "/images/category-diffusers.jpg", caption: "Para el hogar", href: "/catalogo?categoria=hogar" },
  { image: "/images/category-essences.jpg", caption: "Para la ropa", href: "/catalogo?categoria=ropa" },
  { image: "/images/category-kits.jpg", caption: "El regalo perfecto", href: "/catalogo" },
]

export function EditorialStory() {
  return (
    <section className="bg-background py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary">
            Coleccionar historias
          </p>
          <SplitText
            text="Cada aroma, un recuerdo"
            as="h2"
            className="font-serif text-3xl font-medium text-foreground md:text-4xl"
          />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
          {CARDS.map((card, i) => (
            <ScrollReveal key={card.caption} delay={i * 140} distance={56}>
              <Link
                href={card.href}
                className="group relative block aspect-[3/4] overflow-hidden"
              >
                <Image
                  src={card.image}
                  alt={card.caption}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-7 text-center">
                  <span className="font-serif text-2xl font-medium text-white">{card.caption}</span>
                  <span className="mt-2 block text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-white/80 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    Descubrir →
                  </span>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
