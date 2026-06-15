"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"
import type { Product } from "@/lib/supabase"

/**
 * StarShowcase — exposición de aromas estrella (layout ref: buckssauce.com,
 * paleta Cliché). Fondo crema, círculo terracota, líneas punteadas guía,
 * flechas circulares grandes y botón "Comprar ahora". El frasco entra
 * deslizándose y se asienta (interpolación fluida), con leve tilt, levitación
 * continua y reacción al hover.
 */
const STAR_SLUGS = ["dulce-lana", "agua", "eternamente-indigo", "sello-de-dios", "luxury", "tao"]

function baseSlug(slug: string) {
  return slug.replace(/^aroma-/, "")
}
function fmt(n: number) {
  return n.toLocaleString("es-CO")
}

export function StarShowcase() {
  const [pool, setPool] = useState<Product[]>([])
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d: Product[]) => { if (Array.isArray(d)) setPool(d) })
      .catch(() => {})
  }, [])

  const stars = useMemo(() => {
    return STAR_SLUGS
      .map((s) => {
        const product = pool.find((p) => baseSlug(p.slug) === s)
        return product ? { product, cutout: `/images/products/cutout/${s}.png` } : null
      })
      .filter((x): x is { product: Product; cutout: string } => x !== null)
  }, [pool])

  useEffect(() => { if (active >= stars.length) setActive(0) }, [stars.length, active])

  useEffect(() => {
    if (paused || stars.length < 2) return
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const t = setInterval(() => setActive((a) => (a + 1) % stars.length), 5500)
    return () => clearInterval(t)
  }, [paused, stars.length])

  if (stars.length === 0) return null
  const cur = stars[active] ?? stars[0]
  const go = (d: number) => setActive((a) => (a + d + stars.length) % stars.length)

  return (
    <section
      className="relative overflow-hidden bg-[#FAF8F5] py-16 md:py-24"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center md:mb-12">
          <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[#A67163]">
            Aromas estrella
          </p>
          <h2 className="font-serif text-3xl font-medium text-[#2D1A14] md:text-5xl">
            Los favoritos de las marcas
          </h2>
        </div>

        <div className="relative mx-auto max-w-5xl">
          {/* Etiquetas sobre línea punteada (estilo Bucks) */}
          <div className="relative mb-2 hidden h-5 items-center md:flex">
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-[#2D1A14]/20" />
            <span className="relative bg-[#FAF8F5] pr-4 text-[0.66rem] font-semibold uppercase tracking-[0.32em] text-[#2D1A14]/55">
              Aroma N.º {String(active + 1).padStart(2, "0")}
            </span>
            <span
              key={cur.product.id}
              className="star-fade relative ml-auto bg-[#FAF8F5] pl-4 text-[0.66rem] font-semibold uppercase tracking-[0.32em] text-[#2D1A14]/80"
            >
              {cur.product.name}
            </span>
          </div>

          {/* Stage con flechas sobre línea punteada */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-[#2D1A14]/15" />

            <button
              onClick={() => go(-1)}
              aria-label="Aroma anterior"
              className="absolute left-0 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-[#2D1A14] text-[#FAF8F5] shadow-lg transition-colors hover:bg-[#A67163] md:h-[72px] md:w-[72px]"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="relative z-10 mx-auto h-[380px] w-full max-w-[420px] md:h-[440px]">
              {/* Círculo terracota */}
              <div className="absolute left-1/2 top-1/2 h-[290px] w-[290px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#A67163] md:h-[330px] md:w-[330px]" />
              {/* Sombra de contacto */}
              <div className="absolute bottom-8 left-1/2 h-5 w-44 -translate-x-1/2 rounded-[50%] bg-[#2D1A14]/15 blur-xl" />

              {/* Frascos: wrapper(carrusel) > hover-lift > img(tilt+float) */}
              {stars.map((st, i) => {
                const isActive = i === active
                const rel = i - active
                const tx = isActive ? 0 : rel < 0 ? -70 : 70
                return (
                  <div
                    key={st.product.id}
                    className="absolute inset-0 transition-all duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{
                      opacity: isActive ? 1 : 0,
                      transform: `translateX(${tx}px) scale(${isActive ? 1 : 0.9})`,
                      pointerEvents: isActive ? "auto" : "none",
                    }}
                  >
                    <div className="group h-full w-full transition-transform duration-500 ease-out hover:-translate-y-3 hover:scale-[1.04]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={st.cutout}
                        alt={st.product.name}
                        onError={(e) => { e.currentTarget.src = st.product.image_url || "/placeholder-product.jpg" }}
                        className="star-bottle h-full w-full object-contain drop-shadow-2xl"
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <button
              onClick={() => go(1)}
              aria-label="Siguiente aroma"
              className="absolute right-0 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-[#2D1A14] text-[#FAF8F5] shadow-lg transition-colors hover:bg-[#A67163] md:h-[72px] md:w-[72px]"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>

          {/* Botón Comprar (estilo SHOP NOW, superpuesto al círculo) */}
          <div className="relative z-20 -mt-6 flex flex-col items-center md:-mt-8">
            <Link
              href={`/productos/${cur.product.slug}`}
              className="inline-flex items-center gap-3 rounded-md bg-[#2D1A14] px-12 py-4 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#FAF8F5] shadow-xl transition-colors hover:bg-[#A67163] md:py-5"
            >
              Comprar ahora <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-4 text-sm font-semibold text-[#A67163]">
              ${fmt(cur.product.price)} <span className="text-xs font-normal text-[#2D1A14]/40">COP</span>
            </p>

            <div className="mt-5 flex justify-center gap-2.5">
              {stars.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  aria-label={`Ir al aroma ${i + 1}`}
                  className={`h-[3px] rounded-full transition-all duration-500 ${
                    i === active ? "w-8 bg-[#A67163]" : "w-3 bg-[#2D1A14]/20 hover:bg-[#2D1A14]/40"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .star-bottle { animation: star-float 4.5s ease-in-out infinite; transform-origin: center bottom; }
        @keyframes star-float {
          0%, 100% { transform: rotate(-7deg) translateY(0); }
          50% { transform: rotate(-7deg) translateY(-16px); }
        }
        .star-fade { animation: star-fade-in 0.6s ease; }
        @keyframes star-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .star-bottle { animation: none; transform: rotate(-7deg); }
        }
      `}</style>
    </section>
  )
}
