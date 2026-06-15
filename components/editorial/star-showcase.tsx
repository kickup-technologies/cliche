"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"
import type { Product } from "@/lib/supabase"

/**
 * StarShowcase — exposición de aromas estrella (ref: buckssauce.com).
 * Un producto a la vez sobre un disco terracota, con flotación suave, flechas
 * prev/next, dots y autoplay (pausa en hover). Los renders tienen fondo claro,
 * así que usamos mix-blend-multiply para fundirlo con el disco/stage.
 */
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
    const noKits = pool.filter((p) => !p.slug.startsWith("kit-"))
    const flagged = noKits.filter((p) => p.badge && /vendido/i.test(p.badge))
    return (flagged.length >= 3 ? flagged : noKits).slice(0, 6)
  }, [pool])

  useEffect(() => { if (active >= stars.length) setActive(0) }, [stars.length, active])

  useEffect(() => {
    if (paused || stars.length < 2) return
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const t = setInterval(() => setActive((a) => (a + 1) % stars.length), 6000)
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
        <div className="mb-10 text-center md:mb-14">
          <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary">
            Aromas estrella
          </p>
          <h2 className="font-serif text-3xl font-medium text-foreground md:text-5xl">
            Los favoritos de las marcas
          </h2>
        </div>

        <div className="relative mx-auto max-w-4xl">
          {/* Etiquetas laterales (desktop) */}
          <div className="pointer-events-none mb-6 hidden items-center justify-between md:flex">
            <span className="text-[0.66rem] font-semibold uppercase tracking-[0.32em] text-foreground/45">
              Aroma N.º {String(active + 1).padStart(2, "0")}
            </span>
            <span key={cur.id} className="star-fade font-serif text-lg text-foreground/80">
              {cur.name}
            </span>
          </div>

          {/* Stage */}
          <div className="relative flex items-center justify-center">
            <button
              onClick={() => go(-1)}
              aria-label="Aroma anterior"
              className="absolute left-0 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-foreground/15 bg-white/70 text-foreground backdrop-blur transition-colors hover:border-primary hover:text-primary md:h-12 md:w-12"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="relative mx-auto h-[340px] w-full max-w-[340px] md:h-[400px] md:max-w-[400px]">
              {/* Disco terracota + anillo punteado giratorio */}
              <div className="absolute left-1/2 top-1/2 h-[68%] w-[68%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#A67163]" />
              <div className="absolute left-1/2 top-1/2 h-[76%] w-[76%] -translate-x-1/2 -translate-y-1/2 animate-[spin_26s_linear_infinite] rounded-full border border-dashed border-[#A67163]/40" />

              {/* Frascos (crossfade + flotación) */}
              {stars.map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={p.id}
                  src={p.image_url || "/placeholder-product.jpg"}
                  alt={p.name}
                  className={`star-bottle absolute inset-0 h-full w-full object-contain mix-blend-multiply transition-opacity duration-700 ease-out ${
                    i === active ? "opacity-100" : "opacity-0"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() => go(1)}
              aria-label="Siguiente aroma"
              className="absolute right-0 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-foreground/15 bg-white/70 text-foreground backdrop-blur transition-colors hover:border-primary hover:text-primary md:h-12 md:w-12"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Nombre (móvil) + precio + CTA + dots */}
          <div className="mt-8 text-center">
            <p className="font-serif text-xl text-foreground md:hidden">{cur.name}</p>
            <p className="mt-1 font-semibold text-primary">
              ${fmt(cur.price)} <span className="text-xs font-normal text-muted-foreground">COP</span>
            </p>
            <Link
              href={`/productos/${cur.slug}`}
              className="mt-5 inline-flex items-center gap-2 bg-[#2D1A14] px-9 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#FAF8F5] transition-colors hover:bg-[#A67163]"
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
                    i === active ? "w-8 bg-primary" : "w-3 bg-foreground/20 hover:bg-foreground/40"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .star-bottle { animation: star-float 4s ease-in-out infinite; }
        @keyframes star-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        .star-fade { animation: star-fade-in 0.5s ease; }
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
