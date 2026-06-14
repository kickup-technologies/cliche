"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"

interface Slide {
  image: string
  eyebrow?: string
  title: string
  subtitle?: string
  cta?: { label: string; href: string }
  microcopy?: string
  align?: "center" | "left"
}

const SLIDES: Slide[] = [
  {
    image: "/images/hero-main.jpg",
    eyebrow: "Bienestar by Cliché",
    title: "Tu hogar\noliendo a spa",
    subtitle: "Fragancias artesanales 100% naturales. Un puf y tu espacio se transforma en segundos.",
    cta: { label: "Descubrir aromas", href: "/catalogo" },
    microcopy: "100% natural · No mancha · Envío gratis desde $300.000",
    align: "left",
  },
  {
    image: "/images/lifestyle-living.jpg",
    eyebrow: "Hecho en Colombia",
    title: "Un aroma para\ncada espacio",
    subtitle: "Diseñadas para durar todo el día. No irritan, no manchan.",
    cta: { label: "Ver colección", href: "/catalogo" },
    microcopy: "Más de 500 hogares transformados",
    align: "center",
  },
  {
    image: "/images/lifestyle-bedroom.jpg",
    eyebrow: "Rituales diarios",
    title: "Un momento\nque huele a ti",
    subtitle: "Encuentra el aroma que define tu espacio y tu historia.",
    cta: { label: "Explorar aromas", href: "/catalogo" },
    microcopy: "100% artesanal · Fabricado en Colombia",
    align: "center",
  },
]

export function EditorialHero() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setActive((i) => (i + 1) % SLIDES.length), 6500)
    return () => clearInterval(t)
  }, [])

  return (
    <section className="relative h-[82vh] min-h-[560px] w-full overflow-hidden bg-[#2D1A14]">
      {SLIDES.map((slide, i) => {
        const isActive = i === active
        const isLeft = slide.align === "left"

        return (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              isActive ? "opacity-100" : "opacity-0 pointer-events-none"
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

            {/* Gradiente direccional según alineación del texto */}
            {isLeft ? (
              <>
                {/* Sombra lateral izquierda para legibilidad del texto */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
                {/* Sombra inferior sutil para anclar la imagen */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/15" />
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/55" />
                <div className="absolute inset-0 bg-black/10" />
              </>
            )}

            {/* Contenedor de texto */}
            <div
              className={`absolute inset-0 flex flex-col justify-center px-6 ${
                isLeft
                  ? "items-start text-left md:px-14 lg:px-20"
                  : "items-center text-center"
              }`}
            >
              <div className={isLeft ? "max-w-[54%] md:max-w-[46%]" : "max-w-2xl"}>

                {/* Eyebrow — entra primero */}
                {slide.eyebrow && (
                  <p
                    className="mb-4 text-[0.65rem] font-semibold uppercase tracking-[0.38em] text-white/75 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{
                      opacity: isActive ? 1 : 0,
                      transform: isActive ? "translateY(0px)" : "translateY(14px)",
                      transitionDelay: isActive ? "180ms" : "0ms",
                    }}
                  >
                    {slide.eyebrow}
                  </p>
                )}

                {/* Título — el más grande, entra con delay */}
                <h1
                  className="font-serif font-medium leading-[1.04] text-white whitespace-pre-line transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{
                    fontSize: "clamp(2.4rem, 5vw, 4rem)",
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? "translateY(0px)" : "translateY(18px)",
                    transitionDelay: isActive ? "320ms" : "0ms",
                  }}
                >
                  {slide.title}
                </h1>

                {/* Separador decorativo */}
                <div
                  className="my-5 h-[1px] bg-white/25 transition-all duration-700 ease-out"
                  style={{
                    width: isActive ? (isLeft ? "56px" : "40px") : "0px",
                    transitionDelay: isActive ? "480ms" : "0ms",
                  }}
                />

                {/* Subtítulo */}
                {slide.subtitle && (
                  <p
                    className="max-w-sm text-[0.95rem] font-light leading-relaxed text-white/85 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{
                      opacity: isActive ? 1 : 0,
                      transform: isActive ? "translateY(0px)" : "translateY(16px)",
                      transitionDelay: isActive ? "500ms" : "0ms",
                    }}
                  >
                    {slide.subtitle}
                  </p>
                )}

                {/* CTA */}
                {slide.cta && (
                  <div
                    className="transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{
                      opacity: isActive ? 1 : 0,
                      transform: isActive ? "translateY(0px)" : "translateY(14px)",
                      transitionDelay: isActive ? "640ms" : "0ms",
                    }}
                  >
                    <Link
                      href={slide.cta.href}
                      className="mt-8 inline-flex items-center justify-center gap-2 bg-white px-10 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-[#2D1A14] transition-all duration-300 hover:bg-[#A67163] hover:text-white active:scale-[0.98]"
                    >
                      {slide.cta.label}
                      <span className="text-base leading-none">→</span>
                    </Link>
                  </div>
                )}

                {/* Microcopy de confianza */}
                {slide.microcopy && (
                  <p
                    className="mt-5 text-[0.6rem] font-medium uppercase tracking-[0.22em] text-white/45 transition-all duration-700 ease-out"
                    style={{
                      opacity: isActive ? 1 : 0,
                      transitionDelay: isActive ? "800ms" : "0ms",
                    }}
                  >
                    {slide.microcopy}
                  </p>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {/* Dots de navegación */}
      <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 gap-3">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            aria-label={`Ir al slide ${i + 1}`}
            onClick={() => setActive(i)}
            className={`h-[2px] rounded-full transition-all duration-500 ${
              i === active ? "w-10 bg-white" : "w-3 bg-white/35 hover:bg-white/65"
            }`}
          />
        ))}
      </div>

      {/* Indicador de scroll */}
      <div
        className="absolute bottom-8 right-8 hidden flex-col items-center gap-2 transition-all duration-700 ease-out md:flex"
        style={{ opacity: active === 0 ? 0.45 : 0, transitionDelay: "1000ms" }}
        aria-hidden="true"
      >
        <span className="text-[0.55rem] font-semibold uppercase tracking-[0.3em] text-white">Scroll</span>
        <div className="h-8 w-[1px] bg-white/40" />
      </div>
    </section>
  )
}
