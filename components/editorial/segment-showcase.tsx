"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import type { Product } from "@/lib/supabase"
import { productsBySegment, activeSegments, type Segment } from "@/lib/segments"
import { PRICE_TIERS } from "@/lib/pricing"

/**
 * SegmentShowcase — categorías en layout editorial premium. Cada categoría:
 * banner de marca + grilla de aromas, con un reveal escalonado al entrar en
 * pantalla (el banner aparece y los productos caen en cascada). Aire generoso,
 * sin cajas pesadas.
 */
const INITIAL = 4
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)"

const PANELS = [
  { bg: "#2D1A14", fg: "#FAF8F5", sub: "rgba(250,248,245,0.6)", line: "rgba(250,248,245,0.18)", num: "rgba(250,248,245,0.10)" },
  { bg: "#A67163", fg: "#FFFFFF", sub: "rgba(255,255,255,0.72)", line: "rgba(255,255,255,0.28)", num: "rgba(255,255,255,0.16)" },
  { bg: "#EAE0D5", fg: "#2D1A14", sub: "rgba(45,26,20,0.55)", line: "rgba(45,26,20,0.16)", num: "rgba(45,26,20,0.08)" },
]

const KIT_LINE = PRICE_TIERS.filter((t) => t.units > 1)
  .map((t) => `x${t.units} $${t.price.toLocaleString("es-CO")}`)
  .join(" · ")

function fmt(n: number) {
  return n.toLocaleString("es-CO")
}

function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setInView(true); return }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect() } },
      { threshold: 0.15, rootMargin: "0px 0px -12% 0px" },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return { ref, inView }
}

function Category({ seg, i, pool }: { seg: Segment; i: number; pool: Product[] }) {
  const { ref, inView } = useInView<HTMLDivElement>()
  const products = productsBySegment(seg.key, pool).slice(0, 6)
  if (!products.length) return null

  const panel = PANELS[i % PANELS.length]
  const bannerRight = i % 2 === 1
  const reveal = (delay: number) => ({
    opacity: inView ? 1 : 0,
    transform: inView ? "none" : "translateY(34px)",
    transition: `opacity 0.8s ${EASE} ${delay}ms, transform 0.8s ${EASE} ${delay}ms`,
  })

  const banner = (
    <div
      style={{ background: panel.bg, color: panel.fg, ...reveal(0) }}
      className="relative flex min-h-[240px] flex-col justify-center overflow-hidden rounded-2xl p-8 lg:min-h-full lg:p-12"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute right-6 top-5 font-serif text-7xl font-medium leading-none"
        style={{
          color: panel.num,
          opacity: inView ? 1 : 0,
          transform: inView ? "scale(1)" : "scale(0.65)",
          transition: `opacity 1s ${EASE} 120ms, transform 1s ${EASE} 120ms`,
        }}
      >
        {String(i + 1).padStart(2, "0")}
      </span>
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.35em]" style={{ color: panel.sub }}>
        Para
      </p>
      <h3 className="mt-3 font-serif text-3xl font-medium leading-[1.1] md:text-4xl">{seg.label}</h3>
      <div className="my-5 h-px" style={{ background: panel.line, width: inView ? "48px" : "0px", transition: `width 0.9s ${EASE} 260ms` }} />
      <p className="max-w-xs text-sm leading-relaxed" style={{ color: panel.sub }}>{seg.tagline}</p>
      <Link
        href={`/catalogo?segmento=${seg.key}`}
        className="mt-8 inline-flex w-fit items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.22em] transition-opacity hover:opacity-70"
        style={{ color: panel.fg }}
      >
        Ver la categoría <span aria-hidden>→</span>
      </Link>
    </div>
  )

  const count = products.length
  const colClass = count === 1 ? "grid-cols-1" : count <= 4 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-3"
  const grid = (
    <div className={`grid ${colClass} gap-x-5 gap-y-8`}>
      {products.map((p, idx) => {
        const delay = 180 + idx * 110
        return (
          <Link
            key={p.id}
            href={`/productos/${p.slug}`}
            className="group mx-auto flex w-full max-w-[260px] flex-col"
          >
            {/* Cortina: la imagen se descubre de abajo hacia arriba con leve zoom-out */}
            <div
              className="relative aspect-square overflow-hidden rounded-xl bg-secondary/40"
              style={{
                clipPath: inView ? "inset(0 0 0 0)" : "inset(100% 0 0 0)",
                transition: `clip-path 0.95s ${EASE} ${delay}ms`,
              }}
            >
              <div
                className="h-full w-full"
                style={{ transform: inView ? "scale(1)" : "scale(1.14)", transition: `transform 1.2s ${EASE} ${delay}ms` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image_url || "/placeholder-product.jpg"}
                  alt={p.name}
                  className="h-full w-full object-contain p-3 transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </div>
            </div>
            <div
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? "none" : "translateY(14px)",
                transition: `opacity 0.7s ${EASE} ${delay + 300}ms, transform 0.7s ${EASE} ${delay + 300}ms`,
              }}
            >
              <p className="mt-3 line-clamp-1 font-serif text-[15px] text-foreground transition-colors group-hover:text-primary">{p.name}</p>
              <p className="mt-0.5 text-sm font-semibold text-primary">
                ${fmt(PRICE_TIERS[0].price)}<span className="text-[10px] font-normal text-muted-foreground"> /und</span>
              </p>
              <p className="text-[10.5px] leading-snug text-muted-foreground">{KIT_LINE}</p>
            </div>
          </Link>
        )
      })}
    </div>
  )

  return (
    <div
      ref={ref}
      className={`grid grid-cols-1 items-center gap-8 lg:gap-14 ${
        bannerRight ? "lg:grid-cols-[1fr_minmax(0,340px)]" : "lg:grid-cols-[minmax(0,340px)_1fr]"
      }`}
    >
      {bannerRight ? (<>{grid}{banner}</>) : (<>{banner}{grid}</>)}
    </div>
  )
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
    <section className="bg-background py-24 md:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-4 text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-primary">
            ¿A qué huele tu marca?
          </p>
          <h2 className="font-serif text-3xl font-medium leading-tight text-foreground md:text-5xl">
            Un aroma para cada marca
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Elige tu segmento y descubre las fragancias diseñadas para conectar con tu público.
          </p>
        </div>

        <div className="mt-20 space-y-28 md:mt-28 md:space-y-40">
          {shown.map((seg, i) => (
            <Category key={seg.key} seg={seg} i={i} pool={pool} />
          ))}
        </div>

        {segs.length > INITIAL && (
          <div className="mt-20 text-center md:mt-28">
            <button
              onClick={() => setShowAll((v) => !v)}
              className="inline-flex items-center gap-2 border border-foreground/20 px-10 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              {showAll ? "Ver menos" : `Ver todas las categorías (${segs.length})`}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
