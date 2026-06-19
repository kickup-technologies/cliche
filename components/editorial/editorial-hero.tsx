"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"

type SlideMedia =
  | { type: "video"; src: string; poster?: string }
  | { type: "image"; src: string; mobileSrc?: string; objectPosition?: string; mobileObjectPosition?: string }

interface Slide {
  media: SlideMedia
  eyebrow?: string
  title: string
  subtitle?: string
  cta?: { label: string; href: string }
  microcopy?: string
  align?: "center" | "left"
}

const SLIDES: Slide[] = [
  {
    media: { type: "image", src: "/images/segments/bano.png", mobileSrc: "/images/segments/bano-mobile.png", objectPosition: "60% 50%", mobileObjectPosition: "center 70%" },
    eyebrow: "Vestidos de baño & playa",
    title: "Tu marca también\nhuele a verano",
    subtitle: "MAHAI impregna tus prendas de baño con frutas exóticas que duran todo el día y no manchan la tela.",
    cta: { label: "Comprar MAHAI", href: "/productos/aroma-mahai" },
    microcopy: "Frutas exóticas · No mancha · Larga duración",
    align: "left",
  },
  {
    media: { type: "video", src: "/videos/hero-1.mp4" },
    eyebrow: "Bienestar by Cliché",
    title: "¿A qué huele\ntu marca?",
    subtitle: "Marketing olfativo artesanal: creamos el aroma que vuelve inolvidable tu marca, tu tienda o tu espacio.",
    cta: { label: "Descubrir aromas", href: "/catalogo" },
    microcopy: "100% natural · No mancha · Envío gratis desde $300.000",
    align: "left",
  },
  {
    media: { type: "video", src: "/videos/hero-2.mp4" },
    eyebrow: "Hecho en Colombia",
    title: "La identidad olfativa\nde tu marca",
    subtitle: "Hoteles, tiendas, spas y marcas de moda ya tienen su aroma. Diseñamos el tuyo.",
    cta: { label: "Ver colección", href: "/catalogo" },
    microcopy: "100% artesanal · Hecho en Colombia",
    align: "left",
  },
]

export function EditorialHero() {
  const [active, setActive] = useState(0)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])

  useEffect(() => {
    const t = setInterval(() => setActive((i) => (i + 1) % SLIDES.length), 7000)
    return () => clearInterval(t)
  }, [])

  // Reproduce solo el video del slide activo; pausa los demás (rendimiento)
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return
      if (i === active) {
        v.currentTime = 0
        v.play().catch(() => {})
      } else {
        v.pause()
      }
    })
  }, [active])

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
            {/* Media de fondo: video o imagen */}
            {slide.media.type === "video" ? (
              <video
                ref={(el) => { videoRefs.current[i] = el }}
                src={slide.media.src}
                poster={slide.media.poster}
                muted
                loop
                playsInline
                autoPlay={i === 0}
                preload={i === 0 ? "auto" : "metadata"}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <>
                {/* PC: imagen horizontal. Si hay versión móvil, se oculta aquí. */}
                <Image
                  src={slide.media.src}
                  alt={slide.title.replace(/\n/g, " ")}
                  fill
                  priority={i === 0}
                  sizes="100vw"
                  className={`object-cover ${slide.media.mobileSrc ? "hidden md:block" : ""}`}
                  style={{ objectPosition: slide.media.objectPosition ?? "center" }}
                />
                {/* Celular: imagen vertical (art-direction) */}
                {slide.media.mobileSrc && (
                  <Image
                    src={slide.media.mobileSrc}
                    alt={slide.title.replace(/\n/g, " ")}
                    fill
                    priority={i === 0}
                    sizes="100vw"
                    className="object-cover md:hidden"
                    style={{ objectPosition: slide.media.mobileObjectPosition ?? "center" }}
                  />
                )}
              </>
            )}

            {/* Gradiente direccional según alineación del texto */}
            {isLeft ? (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/25 sm:via-black/40 sm:to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/15 sm:from-black/35" />
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/15 to-black/55" />
                <div className="absolute inset-0 bg-black/15" />
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
              <div className={isLeft ? "max-w-[90%] sm:max-w-[72%] md:max-w-[46%]" : "max-w-2xl"}>

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

                <h1
                  className="font-serif font-medium leading-[1.04] text-white whitespace-pre-line transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{
                    fontSize: "clamp(2rem, 7.5vw, 4rem)",
                    textShadow: "0 2px 24px rgba(0,0,0,0.35)",
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? "translateY(0px)" : "translateY(18px)",
                    transitionDelay: isActive ? "320ms" : "0ms",
                  }}
                >
                  {slide.title}
                </h1>

                <div
                  className="my-5 h-[1px] bg-white/25 transition-all duration-700 ease-out"
                  style={{
                    width: isActive ? (isLeft ? "56px" : "40px") : "0px",
                    transitionDelay: isActive ? "480ms" : "0ms",
                  }}
                />

                {slide.subtitle && (
                  <p
                    className={`text-[0.95rem] font-light leading-relaxed text-white/85 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      isLeft ? "max-w-sm" : "mx-auto max-w-md"
                    }`}
                    style={{
                      opacity: isActive ? 1 : 0,
                      transform: isActive ? "translateY(0px)" : "translateY(16px)",
                      transitionDelay: isActive ? "500ms" : "0ms",
                    }}
                  >
                    {slide.subtitle}
                  </p>
                )}

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
    </section>
  )
}
