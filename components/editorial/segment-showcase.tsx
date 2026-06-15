"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import type { Product } from "@/lib/supabase"
import { productsBySegment, activeSegments } from "@/lib/segments"
import { ScrollReveal } from "@/components/editorial/scroll-reveal"

/**
 * SegmentShowcase — jerarquía segmentada del landing.
 * Por cada segmento de marca: un banner + dos hileras de los aromas que
 * le corresponden, alternando el lado del banner. Muestra 4 categorías y
 * un botón "Ver todas" que despliega el resto.
 */
const INITIAL = 4

const PANELS = [
  { bg: "#2D1A14", fg: "#FAF8F5", sub: "rgba(250,248,245,0.6)", line: "rgba(250,248,245,0.25)" },
  { bg: "#A67163", fg: "#FFFFFF", sub: "rgba(255,255,255,0.72)", line: "rgba(255,255,255,0.32)" },
  { bg: "#EAE0D5", fg: "#2D1A14", sub: "rgba(45,26,20,0.55)", line: "rgba(45,26,20,0.2)" },
]

function fmt(n: number) {
  return n.toLocaleString("es-CO")
}

export function SegmentShowcase() {
  const [pool, setPool] = useState<Product[]>([])
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d: Product[]) => { if (Array.isArray(d)) setPool(d) })
      .catch(() => {})
  }, [])

  if (pool.length === 0) return null

  const segs = activeSegments(pool)
  const shown = showAll ? segs : segs.slice(0, INITIAL)

  return (
    <section className="bg-background py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center md:mb-16">
          <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary">
            ¿A qué huele tu marca?
          </p>
          <h2 className="font-serif text-3xl font-medium text-foreground md:text-5xl">
            Un aroma para cada marca
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground md:text-base">
            Elige tu segmento y descubre las fragancias diseñadas para conectar con tu público.
          </p>
        </div>

        <div className="space-y-16 md:space-y-24">
          {shown.map((seg, i) => {
            const products = productsBySegment(seg.key, pool).slice(0, 6)
            if (!products.length) return null
            const panel = PANELS[i % PANELS.length]
            const bannerRight = i % 2 === 1

            const banner = (
              <div
                className="relative flex min-h-[220px] flex-col justify-start overflow-hidden rounded-2xl p-7 lg:min-h-full lg:p-9"
                style={{ background: panel.bg, color: panel.fg }}
              >
                <div>
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.3em]" style={{ color: panel.sub }}>
                    Para
                  </p>
                  <h3 className="mt-2 font-serif text-2xl font-medium leading-tight md:text-3xl">{seg.label}</h3>
                  <div className="my-4 h-px w-10" style={{ background: panel.line }} />
                  <p className="max-w-xs text-sm leading-relaxed" style={{ color: panel.sub }}>{seg.tagline}</p>
                </div>
                <Link
                  href={`/catalogo?segmento=${seg.key}`}
                  className="mt-6 inline-flex w-fit items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.2em] transition-opacity hover:opacity-70"
                  style={{ color: panel.fg }}
                >
                  Ver la categoría <span aria-hidden>→</span>
                </Link>
              </div>
            )

            // Rejilla balanceada para que no quede un producto solo y gigante:
            // 4 → 2×2, 6 → 3×2, etc. Tarjetas con ancho máximo para tamaño parejo.
            const count = products.length
            const colClass =
              count === 1 ? "grid-cols-1" : count <= 4 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-3"
            const productGrid = (
              <div className={`grid ${colClass} gap-4`}>
                {products.map((p) => (
                  <Link
                    key={p.id}
                    href={`/productos/${p.slug}`}
                    className="group mx-auto flex w-full max-w-[260px] flex-col"
                  >
                    <div className="relative aspect-square overflow-hidden rounded-xl bg-secondary/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.image_url || "/placeholder-product.jpg"}
                        alt={p.name}
                        className="h-full w-full object-contain p-3 transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <p className="mt-2 line-clamp-1 text-sm font-medium text-foreground transition-colors group-hover:text-primary">{p.name}</p>
                    <p className="text-sm text-primary">${fmt(p.price)}</p>
                  </Link>
                ))}
              </div>
            )

            return (
              <ScrollReveal key={seg.key} distance={36}>
                <div
                  className={`grid grid-cols-1 gap-6 lg:gap-8 ${
                    bannerRight ? "lg:grid-cols-[1fr_minmax(0,360px)]" : "lg:grid-cols-[minmax(0,360px)_1fr]"
                  }`}
                >
                  {bannerRight ? (<>{productGrid}{banner}</>) : (<>{banner}{productGrid}</>)}
                </div>
              </ScrollReveal>
            )
          })}
        </div>

        {segs.length > INITIAL && (
          <div className="mt-14 text-center">
            <button
              onClick={() => setShowAll((v) => !v)}
              className="inline-flex items-center gap-2 border border-foreground/20 px-9 py-3.5 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              {showAll ? "Ver menos" : `Ver todas las categorías (${segs.length})`}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
