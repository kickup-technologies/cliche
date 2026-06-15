"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"
import type { Product } from "@/lib/supabase"

/**
 * StarShowcase — exposición de aromas estrella (ref: buckssauce.com).
 * Stage oscuro premium: un frasco recortado (PNG transparente) a la vez sobre
 * un disco terracota luminoso. La entrada es una interpolación fluida —el
 * frasco entrante se desliza desde el lado, rota y se asienta en el centro—
 * con flotación continua, flechas, dots y autoplay (pausa en hover).
 */
const STAR_SLUGS = ["agua", "eternamente-indigo", "sello-de-dios", "luxury", "tao", "dulce-lana"]

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
      className="relative overflow-hidden bg-[#211109] py-16 text-[#FAF8F5] md:py-24"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="container mx-auto px-4">
        <div className="mb-10 text-center md:mb-14">
          <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[#C99B8C]">
            Aromas estrella
          </p>
          <h2 className="font-serif text-3xl font-medium text-[#FAF8F5] md:text-5xl">
            Los favoritos de las marcas
          </h2>
        </div>

        <div className="relative mx-auto max-w-4xl">
          {/* Etiquetas laterales (desktop) */}
          <div className="pointer-events-none mb-4 hidden items-center justify-between md:flex">
            <span className="text-[0.66rem] font-semibold uppercase tracking-[0.32em] text-[#FAF8F5]/40">
              Aroma N.º {String(active + 1).padStart(2, "0")}
            </span>
            <span key={cur.product.id} className="star-fade font-serif text-lg text-[#FAF8F5]/85">
              {cur.product.name}
            </span>
          </div>

          {/* Stage */}
          <div className="relative flex items-center justify-center">
            <button
              onClick={() => go(-1)}
              aria-label="Aroma anterior"
              className="absolute left-0 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-[#FAF8F5]/20 bg-[#FAF8F5]/5 text-[#FAF8F5] backdrop-blur transition-colors hover:border-[#C99B8C] hover:text-[#C99B8C] md:h-12 md:w-12"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="relative mx-auto h-[360px] w-full max-w-[380px] md:h-[420px]">
              {/* Glow + disco + anillo */}
              <div
                className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70"
                style={{ background: "radial-gradient(circle, rgba(166,113,99,0.55) 0%, rgba(166,113,99,0) 65%)" }}
              />
              <div className="absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#A67163]/25" />
              <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 animate-[spin_30s_linear_infinite] rounded-full border border-dashed border-[#C99B8C]/30" />
              {/* sombra de contacto */}
              <div className="absolute bottom-7 left-1/2 h-5 w-40 -translate-x-1/2 rounded-[50%] bg-black/40 blur-xl" />

              {/* Frascos — wrapper hace el slide; img hace el float (sin chocar transforms) */}
              {stars.map((st, i) => {
                const isActive = i === active
                const rel = i - active
                const tx = isActive ? 0 : rel < 0 ? -60 : 60
                const rot = isActive ? 0 : rel < 0 ? -6 : 6
                return (
                  <div
                    key={st.product.id}
                    className="absolute inset-0 transition-all duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{
                      opacity: isActive ? 1 : 0,
                      transform: `translateX(${tx}px) rotate(${rot}deg) scale(${isActive ? 1 : 0.9})`,
                      pointerEvents: isActive ? "auto" : "none",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={st.cutout}
                      alt={st.product.name}
                      onError={(e) => { e.currentTarget.src = st.product.image_url || "/placeholder-product.jpg" }}
                      className="star-bottle h-full w-full object-contain drop-shadow-2xl"
                    />
                  </div>
                )
              })}
            </div>

            <button
              onClick={() => go(1)}
              aria-label="Siguiente aroma"
              className="absolute right-0 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-[#FAF8F5]/20 bg-[#FAF8F5]/5 text-[#FAF8F5] backdrop-blur transition-colors hover:border-[#C99B8C] hover:text-[#C99B8C] md:h-12 md:w-12"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Nombre (móvil) + precio + CTA + dots */}
          <div className="mt-8 text-center">
            <p className="font-serif text-xl text-[#FAF8F5] md:hidden">{cur.product.name}</p>
            <p className="mt-1 font-semibold text-[#C99B8C]">
              ${fmt(cur.product.price)} <span className="text-xs font-normal text-[#FAF8F5]/40">COP</span>
            </p>
            <Link
              href={`/productos/${cur.product.slug}`}
              className="mt-5 inline-flex items-center gap-2 bg-[#A67163] px-9 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-white transition-colors hover:bg-[#FAF8F5] hover:text-[#211109]"
            >
              Comprar ahora <ArrowRight className="h-3.5 w-3.5" />
            </Link>

            <div className="mt-7 flex justify-center gap-2.5">
              {stars.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  aria-label={`Ir al aroma ${i + 1}`}
                  className={`h-[3px] rounded-full transition-all duration-500 ${
                    i === active ? "w-8 bg-[#C99B8C]" : "w-3 bg-[#FAF8F5]/20 hover:bg-[#FAF8F5]/40"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .star-bottle { animation: star-float 4.5s ease-in-out infinite; }
        @keyframes star-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-14px); }
        }
        .star-fade { animation: star-fade-in 0.6s ease; }
        @keyframes star-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .star-bottle { animation: none; }
        }
      `}</style>
    </section>
  )
}
