"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"

// mobileSrc (imagen vertical) activa el layout "split" en celular para cualquier
// tipo de media: en PC se muestra el video/imagen de fondo; en móvil, esa imagen.
type SlideMedia = {
  type: "video" | "image"
  src: string
  poster?: string
  mobileSrc?: string
  objectPosition?: string
  mobileObjectPosition?: string
}

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
    media: { type: "image", src: "/images/segments/bano.png", mobileSrc: "/images/segments/bano-mobile.png" },
    eyebrow: "Vestidos de baño & playa",
    title: "Tu marca también\nhuele a verano",
    subtitle: "MAHAI impregna tus prendas de baño con frutas exóticas que duran todo el día y no manchan la tela.",
    cta: { label: "Comprar MAHAI", href: "/productos/aroma-mahai" },
    microcopy: "Frutas exóticas · No mancha · Larga duración",
    align: "left",
  },
  {
    // PC: video de identidad de marca (el que ya teníamos). Móvil: imagen "aire" (hogar).
    media: { type: "video", src: "/videos/hero-2.mp4", mobileSrc: "/images/segments/aire-mobile.png" },
    eyebrow: "Hecho en Colombia",
    title: "La identidad olfativa\nde tu marca",
    subtitle: "Hoteles, tiendas, spas y marcas de moda ya tienen su aroma. Diseñamos el tuyo.",
    cta: { label: "Ver colección", href: "/catalogo" },
    microcopy: "100% artesanal · Hecho en Colombia",
    align: "left",
  },
  {
    media: { type: "image", src: "/images/segments/gym.png", mobileSrc: "/images/segments/gym-mobile.png" },
    eyebrow: "Gimnasios & deporte",
    title: "El aroma que\naguanta tu ritmo",
    subtitle: "Lycra de Verano mantiene tu ropa deportiva fresca entrenamiento tras entrenamiento. La frescura que tu marca lleva puesta.",
    cta: { label: "Comprar Lycra de Verano", href: "/productos/aroma-lycra-de-verano" },
    microcopy: "Frescura duradera · No mancha · Ideal para activewear",
    align: "left",
  },
]

export function EditorialHero() {
  const [active, setActive] = useState(0)
  // null durante SSR/hidratación: aún no conocemos el ancho real. Con matchMedia
  // renderizamos UNA sola variante (desktop o móvil) — display:none NO evita la
  // descarga de una imagen, así que antes bajaban las 2 variantes de cada slide.
  const [media, setMedia] = useState<"mobile" | "desktop" | null>(null)
  // Los slides no activos montan su media unos segundos después del primer
  // paint: el slide 1 (LCP) no compite con las imágenes de los slides 2 y 3.
  const [warm, setWarm] = useState(false)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const touch = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)")
    const update = () => setMedia(mq.matches ? "desktop" : "mobile")
    update()
    mq.addEventListener("change", update)
    const t = window.setTimeout(() => setWarm(true), 3500)
    return () => {
      mq.removeEventListener("change", update)
      clearTimeout(t)
    }
  }, [])

  useEffect(() => {
    const t = setInterval(() => setActive((i) => (i + 1) % SLIDES.length), 7000)
    return () => clearInterval(t)
  }, [])

  const go = (dir: 1 | -1) =>
    setActive((i) => (i + dir + SLIDES.length) % SLIDES.length)

  // Swipe táctil (celular): deslizar a izquierda/derecha cambia de slide.
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touch.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touch.current.x
    const dy = t.clientY - touch.current.y
    touch.current = null
    // Solo si el gesto es claramente horizontal (no un scroll vertical)
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      go(dx < 0 ? 1 : -1)
    }
  }

  // Reproduce solo el video del slide activo; pausa los demás (rendimiento).
  // Depende también de `media`: el video se monta tarde (solo en desktop) y
  // debe arrancar si el slide ya era el activo cuando apareció.
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
  }, [active, media])

  return (
    <section
      className="relative h-[90vh] min-h-[660px] w-full overflow-hidden bg-[#2D1A14] md:h-[82vh] md:min-h-[560px]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {SLIDES.map((slide, i) => {
        const isActive = i === active
        const isLeft = slide.align === "left"
        // Slides con imagen + versión móvil → layout "split" en celular:
        // imagen arriba, texto en un panel café debajo (no tapa el producto).
        const splitMobile = !!slide.media.mobileSrc
        // Solo el slide activo carga su media de inmediato; los demás esperan
        // a "warm" (unos segundos después del primer paint) o a volverse activos.
        const mountMedia = isActive || warm
        // Mientras media === null (SSR / primer render) se montan ambas variantes
        // para no romper la hidratación; el truco de sizes (abajo) hace que la
        // variante oculta solo descargue un thumbnail de 16px.
        const showDesktopMedia = mountMedia && (!splitMobile || media !== "mobile")
        const showMobileMedia = mountMedia && splitMobile && media !== "desktop"

        return (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              isActive ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            {/* Media de fondo PC: video o imagen. Si hay versión móvil, se oculta
                en celular (md:block) y abajo se monta el split. */}
            {slide.media.type === "video" ? (
              // El video SOLO se monta cuando sabemos que es desktop (md+): en
              // móvil está oculto por CSS pero play() forzaba la descarga de
              // los 5 MB de hero-2.mp4 por datos móviles. Si tiene variante
              // móvil, exigimos media === "desktop"; preload solo al activo.
              (splitMobile ? media === "desktop" : mountMedia) && (
                <video
                  ref={(el) => { videoRefs.current[i] = el }}
                  src={slide.media.src}
                  poster={slide.media.poster}
                  muted
                  loop
                  playsInline
                  autoPlay={i === 0}
                  preload={isActive ? "auto" : "none"}
                  className={`absolute inset-0 h-full w-full object-cover ${slide.media.mobileSrc ? "hidden md:block" : ""}`}
                />
              )
            ) : (
              showDesktopMedia && (
                <Image
                  src={slide.media.src}
                  alt={slide.title.replace(/\n/g, " ")}
                  fill
                  priority={i === 0}
                  // En móvil esta variante está oculta: 1px hace que el browser
                  // elija el srcset más pequeño (16px) en vez del de 100vw.
                  sizes={splitMobile ? "(max-width: 767px) 1px, 100vw" : "100vw"}
                  className={`object-cover ${slide.media.mobileSrc ? "hidden md:block" : ""}`}
                  style={{ objectPosition: slide.media.objectPosition ?? "center" }}
                />
              )
            )}

            {/* Celular (split): imagen vertical en la mitad superior, degradada
                hacia el fondo café; el texto vive debajo y NO tapa el producto.
                Aplica a cualquier slide con mobileSrc (imagen o video en PC). */}
            {showMobileMedia && (
              <div className="absolute inset-x-0 top-0 h-[57%] overflow-hidden md:hidden">
                <Image
                  src={slide.media.mobileSrc!}
                  alt={slide.title.replace(/\n/g, " ")}
                  fill
                  priority={i === 0}
                  // En desktop esta variante está oculta: 1px → thumbnail de 16px
                  sizes="(min-width: 768px) 1px, 100vw"
                  className="object-cover"
                  style={{ objectPosition: slide.media.mobileObjectPosition ?? "center" }}
                />
                {/* Fade fino solo en el borde inferior: no oscurece el label */}
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#2D1A14] to-transparent" />
              </div>
            )}

            {/* Gradiente direccional según alineación del texto.
                En slides "split" estos overlays son solo de PC (en móvil la
                imagen va limpia arriba y el texto en el panel café de abajo). */}
            {isLeft ? (
              <>
                <div className={`absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/25 sm:via-black/40 sm:to-transparent ${splitMobile ? "hidden md:block" : ""}`} />
                <div className={`absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/15 sm:from-black/35 ${splitMobile ? "hidden md:block" : ""}`} />
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/15 to-black/55" />
                <div className="absolute inset-0 bg-black/15" />
              </>
            )}

            {/* Contenedor de texto */}
            <div
              className={`absolute flex flex-col px-6 ${
                splitMobile
                  ? "inset-x-0 bottom-0 top-[56%] items-start justify-start pt-4 text-left md:inset-0 md:top-0 md:justify-center md:pt-0 md:px-14 lg:px-20"
                  : isLeft
                    ? "inset-0 items-start justify-center text-left md:px-14 lg:px-20"
                    : "inset-0 items-center justify-center text-center"
              }`}
            >
              <div className={isLeft ? "max-w-[90%] sm:max-w-[72%] md:max-w-[46%]" : "max-w-2xl"}>

                {slide.eyebrow && (
                  <p
                    className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.38em] text-white/75 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] md:mb-4"
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
                  className="my-3 h-[1px] bg-white/25 transition-all duration-700 ease-out md:my-5"
                  style={{
                    width: isActive ? (isLeft ? "56px" : "40px") : "0px",
                    transitionDelay: isActive ? "480ms" : "0ms",
                  }}
                />

                {slide.subtitle && (
                  <p
                    className={`line-clamp-2 text-[0.9rem] font-light leading-relaxed text-white/85 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] sm:text-[0.95rem] md:line-clamp-none ${
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
                      className="group/cta mt-6 inline-flex items-center gap-3 rounded-full bg-[#FAF8F5] py-2 pl-7 pr-2 text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-[#2D1A14] shadow-[0_12px_34px_rgba(0,0,0,0.28)] transition-all duration-300 hover:bg-[#A67163] hover:text-white active:scale-[0.98] md:mt-8"
                    >
                      {slide.cta.label}
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2D1A14] text-[#FAF8F5] transition-all duration-300 group-hover/cta:translate-x-0.5 group-hover/cta:bg-white group-hover/cta:text-[#2D1A14]">
                        <span className="text-sm leading-none">→</span>
                      </span>
                    </Link>
                  </div>
                )}

                {slide.microcopy && (
                  <p
                    className="mt-5 hidden text-[0.6rem] font-medium uppercase tracking-[0.22em] text-white/45 transition-all duration-700 ease-out md:block"
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
