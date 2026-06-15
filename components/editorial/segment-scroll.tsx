"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { Product } from "@/lib/supabase"
import { productsBySegment, activeSegments } from "@/lib/segments"

/**
 * SegmentScroll — sección de categorías FIJA (pinned). El contenedor interior
 * queda sticky ocupando la pantalla mientras la sección (muy alta) se scrollea;
 * el progreso del scroll mapea a la categoría activa, así una categoría sale y
 * entra la siguiente: se siente como que las cards pasan, no que bajamos.
 */
const PANELS = [
  { bg: "#2D1A14", fg: "#FAF8F5", sub: "rgba(250,248,245,0.6)", line: "rgba(250,248,245,0.25)" },
  { bg: "#A67163", fg: "#FFFFFF", sub: "rgba(255,255,255,0.72)", line: "rgba(255,255,255,0.32)" },
  { bg: "#EAE0D5", fg: "#2D1A14", sub: "rgba(45,26,20,0.55)", line: "rgba(45,26,20,0.2)" },
]
const MAX_SEGMENTS = 6
const VH_PER = 90 // alto de scroll por categoría

function fmt(n: number) {
  return n.toLocaleString("es-CO")
}

export function SegmentScroll() {
  const [pool, setPool] = useState<Product[]>([])
  const [progress, setProgress] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d: Product[]) => { if (Array.isArray(d)) setPool(d) })
      .catch(() => {})
  }, [])

  const segs = useMemo(() => activeSegments(pool).slice(0, MAX_SEGMENTS), [pool])

  useEffect(() => {
    const onScroll = () => {
      const el = wrapRef.current
      if (!el) return
      const total = el.offsetHeight - window.innerHeight
      const scrolled = -el.getBoundingClientRect().top
      setProgress(total > 0 ? Math.max(0, Math.min(1, scrolled / total)) : 0)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [segs.length])

  if (pool.length === 0 || segs.length === 0) return null

  const len = segs.length
  const pos = progress * (len - 1) // categoría flotante 0..len-1
  const activeIdx = Math.round(pos)

  return (
    <section ref={wrapRef} className="relative bg-[#FAF8F5]" style={{ height: `${len * VH_PER}vh` }}>
      <div className="sticky top-0 flex h-screen flex-col overflow-hidden">
        {/* Encabezado fijo */}
        <div className="container mx-auto px-4 pt-16 text-center md:pt-20">
          <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[#A67163]">
            ¿A qué huele tu marca?
          </p>
          <h2 className="font-serif text-3xl font-medium text-[#2D1A14] md:text-5xl">
            Un aroma para cada marca
          </h2>
        </div>

        {/* Escenario de categorías superpuestas */}
        <div className="relative flex-1">
          {segs.map((seg, i) => {
            const offset = i - pos
            const visible = Math.abs(offset) < 1.05
            const panel = PANELS[i % PANELS.length]
            const bannerRight = i % 2 === 1
            const products = productsBySegment(seg.key, pool).slice(0, 4)

            const banner = (
              <div
                className="relative flex min-h-[200px] flex-col justify-start overflow-hidden rounded-2xl p-7 lg:min-h-[360px] lg:p-9"
                style={{ background: panel.bg, color: panel.fg }}
              >
                <div>
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.3em]" style={{ color: panel.sub }}>Para</p>
                  <h3 className="mt-2 font-serif text-2xl font-medium leading-tight md:text-3xl">{seg.label}</h3>
                  <div className="my-4 h-px w-10" style={{ background: panel.line }} />
                  <p className="max-w-xs text-sm leading-relaxed" style={{ color: panel.sub }}>{seg.tagline}</p>
                </div>
                <Link
                  href={`/catalogo?segmento=${seg.key}`}
                  className="mt-6 inline-flex w-fit items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.2em] transition-opacity hover:opacity-70"
                  style={{ color: panel.fg }}
                >
                  Ver la categoría <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )

            const grid = (
              <div className="grid grid-cols-2 gap-4">
                {products.map((p) => (
                  <Link key={p.id} href={`/productos/${p.slug}`} className="group mx-auto flex w-full max-w-[230px] flex-col">
                    <div className="relative aspect-square overflow-hidden rounded-xl bg-secondary/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.image_url || "/placeholder-product.jpg"} alt={p.name} className="h-full w-full object-contain p-3 transition-transform duration-500 group-hover:scale-105" />
                    </div>
                    <p className="mt-2 line-clamp-1 text-sm font-medium text-foreground transition-colors group-hover:text-primary">{p.name}</p>
                    <p className="text-sm text-primary">${fmt(p.price)}</p>
                  </Link>
                ))}
              </div>
            )

            return (
              <div
                key={seg.key}
                aria-hidden={i !== activeIdx}
                className="absolute inset-0 flex items-center transition-none"
                style={{
                  transform: `translateY(${offset * 14}vh) scale(${1 - Math.min(0.12, Math.abs(offset) * 0.12)})`,
                  opacity: visible ? 1 - Math.min(1, Math.abs(offset)) : 0,
                  pointerEvents: i === activeIdx ? "auto" : "none",
                  zIndex: i === activeIdx ? 10 : 1,
                }}
              >
                <div className="container mx-auto px-4">
                  <div className={`grid grid-cols-1 items-center gap-6 lg:gap-10 ${bannerRight ? "lg:grid-cols-[1fr_minmax(0,360px)]" : "lg:grid-cols-[minmax(0,360px)_1fr]"}`}>
                    {bannerRight ? (<>{grid}{banner}</>) : (<>{banner}{grid}</>)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Indicador de progreso (puntos verticales) */}
        <div className="pointer-events-none absolute right-5 top-1/2 hidden -translate-y-1/2 flex-col gap-2.5 md:flex">
          {segs.map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full transition-all duration-300 ${i === activeIdx ? "scale-125 bg-[#A67163]" : "bg-[#2D1A14]/15"}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
