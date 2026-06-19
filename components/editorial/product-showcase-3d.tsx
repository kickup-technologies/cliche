"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { Magnetic } from "@/components/magnetic"

/**
 * ProductShowcase3D — vitrina rotativa de frascos renderizados en vivo (GLB real).
 * Cada aroma gira sobre su eje ~una vuelta completa, se desvanece (vanish) y entra
 * el siguiente con su propio copy: textos funcionales, ligados al producto, que
 * nutren e incitan a la compra. Split editorial: render a la izquierda, copy a la
 * derecha. Un solo Canvas (cambiamos el modelo por prop, sin recrear WebGL).
 */
const MeshyViewer = dynamic(
  () => import("@/components/meshy-viewer").then((m) => m.MeshyViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-square w-full items-center justify-center">
        <div className="h-14 w-14 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    ),
  }
)

interface ShowItem {
  model: string
  slug: string
  eyebrow: string
  title: string
  text: string
  bullets: string[]
}

// El frasco gira a ~0.45 rad/s → una vuelta completa ≈ 14 s
const CYCLE_MS = 14000
const FADE_MS = 850

const SHOWCASE: ShowItem[] = [
  {
    model: "/models/luxury.glb",
    slug: "aroma-luxury",
    eyebrow: "Aroma Luxury",
    title: "El lujo que se respira",
    text: "Notas amaderadas profundas que visten de estatus tu recepción, showroom o boutique. El detalle invisible que eleva la percepción de tu marca desde que el cliente entra.",
    bullets: ["Ámbar · sándalo · cuero", "Ideal para hoteles y retail premium", "Larga duración"],
  },
  {
    model: "/models/calor-de-lana.glb",
    slug: "aroma-calor-de-lana",
    eyebrow: "Aroma Calor de Lana",
    title: "Calidez que abraza",
    text: "Tonos dulces y reconfortantes que evocan suavidad y cercanía. Perfecto para perfumar prendas, empaques y espacios que quieren sentirse como un abrazo —y que tus clientes recuerden.",
    bullets: ["Frutales · florales · almizcles", "Pensado para textiles y empaques", "No mancha"],
  },
  {
    model: "/models/tao.glb",
    slug: "aroma-tao",
    eyebrow: "Aroma Tāo",
    title: "Equilibrio en cada nota",
    text: "Una fragancia serena y sofisticada para spas, estudios y espacios de bienestar. Invita a tus clientes a respirar hondo, quedarse más tiempo y volver.",
    bullets: ["Floral · sereno", "Ideal para spa y wellness", "100% natural"],
  },
  {
    model: "/models/romeo-y-julieta.glb",
    slug: "aroma-romeo-y-julieta",
    eyebrow: "Aroma Romeo y Julieta",
    title: "Una firma que enamora",
    text: "Notas florales envolventes que crean conexión emocional con tu cliente. La identidad olfativa ideal para floristerías, eventos y marcas de moda que quieren dejar huella.",
    bullets: ["Floral romántico", "Ideal para moda y eventos", "Aroma memorable"],
  },
]

export function ProductShowcase3D() {
  const [active, setActive] = useState(0)
  const [shown, setShown] = useState(true)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const id = setInterval(() => {
      setShown(false) // vanish
      setTimeout(() => {
        setActive((i) => (i + 1) % SHOWCASE.length)
        setShown(true) // appear con el nuevo render + copy
      }, FADE_MS)
    }, CYCLE_MS)
    return () => clearInterval(id)
  }, [])

  const item = SHOWCASE[active]
  const fade = (delay = 0) => ({
    opacity: shown ? 1 : 0,
    transform: shown ? "translateY(0)" : "translateY(10px)",
    transition: `opacity ${FADE_MS}ms cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform ${FADE_MS}ms cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
  })

  return (
    <section className="overflow-hidden bg-secondary">
      <div className="container mx-auto grid grid-cols-1 items-center gap-10 px-4 py-20 md:grid-cols-2 md:py-28">
        {/* Render 3D real, girando — se desvanece y entra el siguiente */}
        <div className="relative mx-auto aspect-square w-full max-w-[460px]">
          <div className="absolute inset-0" style={{ opacity: shown ? 1 : 0, transition: `opacity ${FADE_MS}ms ease` }}>
            <MeshyViewer url={item.model} />
          </div>
          <p className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-[0.6rem] font-medium uppercase tracking-[0.28em] text-muted-foreground/70">
            Arrastra para girar
          </p>

          {/* indicador de progreso de la vitrina */}
          <div className="absolute -bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
            {SHOWCASE.map((_, i) => (
              <span
                key={i}
                className={`h-[3px] rounded-full transition-all duration-500 ${i === active ? "w-7 bg-primary" : "w-2.5 bg-foreground/20"}`}
              />
            ))}
          </div>
        </div>

        {/* Copy ligado al producto en vitrina */}
        <div className="text-center md:text-left">
          <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary" style={fade(60)}>
            {item.eyebrow}
          </p>
          <h2
            className="font-serif text-3xl font-medium leading-tight text-foreground md:text-5xl"
            style={fade(120)}
          >
            {item.title}
          </h2>
          <p
            className="mx-auto mt-6 max-w-md text-sm font-light leading-relaxed text-muted-foreground md:mx-0 md:text-base"
            style={fade(180)}
          >
            {item.text}
          </p>

          {/* Beneficios del aroma en vitrina */}
          <ul className="mx-auto mt-7 flex max-w-md flex-wrap justify-center gap-x-6 gap-y-2 md:mx-0 md:justify-start" style={fade(240)}>
            {item.bullets.map((b) => (
              <li key={b} className="flex items-center gap-2 text-xs tracking-wide text-foreground/75">
                <span className="h-1 w-1 rounded-full bg-primary" />
                {b}
              </li>
            ))}
          </ul>

          {/* Llamados a la acción */}
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4 md:justify-start" style={fade(300)}>
            <Magnetic>
              <Link
                href={`/productos/${item.slug}`}
                className="inline-flex items-center justify-center bg-foreground px-9 py-3.5 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-background transition-colors hover:bg-primary"
              >
                Comprar este aroma
              </Link>
            </Magnetic>
            <Link
              href="/catalogo"
              className="inline-flex items-center justify-center border border-foreground/30 px-9 py-3.5 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-foreground transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
            >
              Ver la colección
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
