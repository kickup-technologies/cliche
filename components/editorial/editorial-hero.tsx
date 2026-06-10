"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"

/**
 * EditorialHero — slideshow fotográfico full-bleed (estilo renesme).
 * Imagen a sangre completa, titular serif centrado/bajo y CTA minimal.
 * Auto-rota entre slides con dots de navegación.
 */
interface Slide {
  image: string
  eyebrow?: string
  title: string
  subtitle?: string
  cta?: { label: string; href: string }
  align?: "center" | "left"
}

const SLIDES: Slide[] = [
  {
    image: "/images/hero-main.jpg",
    eyebrow: "Bienestar by Cliché",
    title: "Aromas que cuentan historias",
    subtitle: "Fragancias artesanales para transformar tu espacio.",
    cta: { label: "Comprar ahora", href: "/catalogo" },
    align: "center",
  },
  {
    image: "/images/lifestyle-living.jpg",
    eyebrow: "Hecho en Colombia",
    title: "Tu hogar oliendo a spa",
    subtitle: "Unos pufs duran todo el día. 100% natural, no mancha.",
    cta: { label: "Ver colección", href: "/catalogo" },
    align: "center",
  },
  {
    image: "/images/lifestyle-bedroom.jpg",
    eyebrow: "Rituales diarios",
    title: "Un aroma para cada momento",
    subtitle: "Encuentra el tuyo entre nuestras fragancias.",
    cta: { label: "Explorar aromas", href: "/catalogo" },
    align: "center",
  },
]

export function EditorialHero() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setActive((i) => (i + 1) % SLIDES.length), 6000)
    return () => clearInterval(t)
  }, [])

  return (
    <section className="relative h-[78vh] min-h-[520px] w-full overflow-hidden bg-foreground">
      {SLIDES.map((slide, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            i === active ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <Image
            src={slide.image}
            alt={slide.title}
            fill
            priority={i === 0}
            sizes="100vw"
            className="object-cover"
          />
          {/* velo para legibilidad del texto */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/45" />

          <div
            className={`absolute inset-0 flex flex-col justify-center px-6 ${
              slide.align === "left" ? "items-start text-left md:px-20" : "items-center text-center"
            }`}
          >
            <div className="max-w-2xl">
              {slide.eyebrow && (
                <p className="mb-4 text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-white/85">
                  {slide.eyebrow}
                </p>
              )}
              <h1 className="font-serif text-4xl font-medium leading-[1.08] text-white drop-shadow-sm md:text-6xl">
                {slide.title}
              </h1>
              {slide.subtitle && (
                <p className="mx-auto mt-5 max-w-md text-base font-light leading-relaxed text-white/90 md:text-lg">
                  {slide.subtitle}
                </p>
              )}
              {slide.cta && (
                <Link
                  href={slide.cta.href}
                  className="mt-8 inline-flex items-center justify-center bg-white px-9 py-3.5 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-foreground transition-colors hover:bg-primary hover:text-white"
                >
                  {slide.cta.label}
                </Link>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* dots */}
      <div className="absolute bottom-7 left-1/2 z-10 flex -translate-x-1/2 gap-2.5">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            aria-label={`Ir al slide ${i + 1}`}
            onClick={() => setActive(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === active ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </section>
  )
}
