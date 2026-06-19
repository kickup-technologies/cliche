"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import type { Product } from "@/lib/supabase"
import { productsBySegment, activeSegments, type Segment } from "@/lib/segments"
import { PRICE_TIERS } from "@/lib/pricing"

/**
 * SegmentShowcase — categorías como CINEMÁTICA HORIZONTAL (ref de movimiento:
 * Guarantees / buckssauce). La sección se fija y al hacer scroll vertical la
 * "rueda" de segmentos avanza de lado, uno a pantalla completa (banner + aromas).
 * Muestra 4 categorías; con "Ver más" la sección crece y continúa la animación
 * con el resto (el panel actual se mantiene, sin saltos). Si no se pulsa, el
 * scroll sigue hacia abajo. Fallback editorial vertical en móvil / reduced-motion.
 */
const INITIAL = 4
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)"

const SEGMENT_IMAGES: Record<string, string> = {
  femeninas: "/images/segments/femeninas.jpg",
  masculinas: "/images/segments/masculinas.jpg",
  unisex: "/images/segments/unisex.jpg",
  infantiles: "/images/segments/infantiles.jpg",
  deportivas: "/images/segments/deportivas.jpg",
  accesorios: "/images/segments/accesorios.jpg",
  bano: "/images/segments/bano.jpg",
  hoteles: "/images/segments/hoteles.jpg",
  spa: "/images/segments/spa.jpg",
  hogar: "/images/segments/hogar.jpg",
  mascotas: "/images/segments/mascotas.jpg",
  luxury: "/images/segments/luxury.jpg",
}

const KIT_LINE = PRICE_TIERS.filter((t) => t.units > 1)
  .map((t) => `x${t.units} $${t.price.toLocaleString("es-CO")}`)
  .join(" · ")

function fmt(n: number) {
  return n.toLocaleString("es-CO")
}

/* ───────── Tarjeta de aroma compacta (para los paneles) ───────── */
function MiniCard({ p }: { p: Product }) {
  return (
    <Link href={`/productos/${p.slug}`} className="group flex flex-col">
      <div className="relative aspect-square overflow-hidden rounded-lg border border-border/50 bg-secondary/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={p.image_url || "/placeholder-product.jpg"}
          alt={p.name}
          loading="lazy"
          className="h-full w-full object-contain p-3 transition-transform duration-700 ease-out group-hover:scale-105"
        />
      </div>
      <p className="mt-2 line-clamp-1 font-serif text-[13px] text-foreground transition-colors group-hover:text-primary">{p.name}</p>
      <p className="text-[12px] font-semibold text-primary">${fmt(PRICE_TIERS[0].price)}<span className="text-[9px] font-normal text-muted-foreground"> /und</span></p>
    </Link>
  )
}

/* ───────── Panel de segmento a pantalla completa (cinemática) ───────── */
function SegmentPanel({
  seg, i, pool, panelRef,
}: {
  seg: Segment; i: number; pool: Product[]; panelRef: (el: HTMLDivElement | null) => void
}) {
  const products = productsBySegment(seg.key, pool).slice(0, 4)
  const img = SEGMENT_IMAGES[seg.key]

  return (
    <div ref={panelRef} className="relative flex h-full w-screen flex-shrink-0 items-center">
      {/* número colosal de fondo */}
      <span
        data-giant
        aria-hidden
        className="pointer-events-none absolute right-[2vw] top-1/2 z-0 -translate-y-1/2 select-none font-serif font-medium leading-none text-[#2D1A14]/[0.045]"
        style={{ fontSize: "52vh" }}
      >
        {String(i + 1).padStart(2, "0")}
      </span>

      <div data-content className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-[6vw] lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-14">
        {/* Banner */}
        <div className="relative h-[58vh] max-h-[600px] min-h-[360px] overflow-hidden rounded-2xl">
          {img ? (
            <Image src={img} alt={seg.label} fill sizes="(max-width:1024px) 90vw, 420px" className="object-cover" />
          ) : (
            <div className="absolute inset-0 bg-[#2D1A14]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
          <div className="absolute inset-x-0 bottom-0 z-10 p-8 text-[#FAF8F5]">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-white/75">Para</p>
            <h3 className="mt-2 font-serif text-4xl font-medium leading-[1.05] md:text-5xl">{seg.label}</h3>
            <div className="my-4 h-px w-12 bg-white/50" />
            <p className="max-w-xs text-sm leading-relaxed text-white/80">{seg.tagline}</p>
            <Link
              href={`/catalogo?segmento=${seg.key}`}
              className="mt-6 inline-flex w-fit items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-white transition-opacity hover:opacity-70"
            >
              Ver la categoría <span aria-hidden>→</span>
            </Link>
          </div>
        </div>

        {/* Aromas del segmento */}
        <div>
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-primary">
            Aromas destacados
          </p>
          <h4 className="mt-2 font-serif text-2xl font-medium text-foreground">
            La selección para {seg.label.toLowerCase()}
          </h4>
          {products.length > 0 && (
            <div className="mt-7 grid grid-cols-2 gap-x-5 gap-y-7">
              {products.map((p) => <MiniCard key={p.id} p={p} />)}
            </div>
          )}
          <p className="mt-6 text-[11px] leading-snug text-muted-foreground">
            Kits: {KIT_LINE}
          </p>
        </div>
      </div>
    </div>
  )
}

/* ───────── Fallback vertical (móvil): cada segmento apilado ───────── */
function MobileCategory({ seg, i, pool }: { seg: Segment; i: number; pool: Product[] }) {
  const products = productsBySegment(seg.key, pool).slice(0, 4)
  const img = SEGMENT_IMAGES[seg.key]
  if (!products.length) return null
  return (
    <div>
      <div className="relative h-[300px] overflow-hidden rounded-2xl">
        {img && <Image src={img} alt={seg.label} fill sizes="100vw" className="object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
        <span aria-hidden className="absolute right-5 top-4 font-serif text-5xl font-medium text-white/15">{String(i + 1).padStart(2, "0")}</span>
        <div className="absolute inset-x-0 bottom-0 p-6 text-[#FAF8F5]">
          <p className="text-[0.58rem] font-semibold uppercase tracking-[0.3em] text-white/75">Para</p>
          <h3 className="mt-1 font-serif text-3xl font-medium">{seg.label}</h3>
          <p className="mt-2 max-w-xs text-xs leading-relaxed text-white/80">{seg.tagline}</p>
          <Link href={`/catalogo?segmento=${seg.key}`} className="mt-4 inline-flex items-center gap-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-white">
            Ver la categoría <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6">
        {products.map((p) => <MiniCard key={p.id} p={p} />)}
      </div>
    </div>
  )
}

export function SegmentShowcase() {
  const [pool, setPool] = useState<Product[]>([])
  const [showAll, setShowAll] = useState(false)
  const [showMobileAll, setShowMobileAll] = useState(false)
  const [nearEnd, setNearEnd] = useState(false)

  const sectionRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const panelRefs = useRef<(HTMLDivElement | null)[]>([])
  const counterRef = useRef<HTMLSpanElement>(null)
  const progressRef = useRef<HTMLSpanElement>(null)
  const showAllRef = useRef(showAll)
  showAllRef.current = showAll

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d: Product[]) => { if (Array.isArray(d)) setPool(d) })
      .catch(() => {})
  }, [])

  const segs = pool.length ? activeSegments(pool) : []
  const N = showAll ? segs.length : Math.min(INITIAL, segs.length)

  useEffect(() => {
    const section = sectionRef.current
    const track = trackRef.current
    if (!section || !track || N < 2) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let raf = 0
    let running = false
    let lastNear = false

    const tick = () => {
      const rect = section.getBoundingClientRect()
      const vh = window.innerHeight
      const dist = Math.max(1, rect.height - vh)
      const p = Math.min(1, Math.max(0, -rect.top / dist))
      const exact = p * (N - 1)

      track.style.transform = `translate3d(${(-exact * 100).toFixed(3)}vw, 0, 0)`

      const active = Math.round(exact)
      panelRefs.current.forEach((el, i) => {
        if (!el) return
        const rel = exact - i
        const d = Math.min(1, Math.abs(rel))
        el.style.opacity = String(1 - d * 0.5)
        const num = el.querySelector<HTMLElement>("[data-giant]")
        const content = el.querySelector<HTMLElement>("[data-content]")
        if (num) num.style.transform = `translate3d(${(rel * -30).toFixed(1)}px, -50%, 0)`
        if (content) content.style.transform = `translate3d(${(rel * 14).toFixed(1)}px, 0, 0)`
      })

      if (counterRef.current) counterRef.current.textContent = String(active + 1).padStart(2, "0")
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${(N > 1 ? exact / (N - 1) : 0).toFixed(3)})`

      // Botón "Ver más": visible cerca del último panel inicial, si no se ha expandido
      const near = !showAllRef.current && exact >= INITIAL - 1.35
      if (near !== lastNear) { lastNear = near; setNearEnd(near) }

      if (running) raf = requestAnimationFrame(tick)
    }

    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !running) { running = true; raf = requestAnimationFrame(tick) }
        else if (!e.isIntersecting && running) { running = false; cancelAnimationFrame(raf) }
      },
      { rootMargin: "30% 0px 30% 0px" }
    )
    io.observe(section)
    return () => { running = false; cancelAnimationFrame(raf); io.disconnect() }
  }, [N])

  if (pool.length === 0 || segs.length === 0) return null

  const shown = segs.slice(0, N)
  const total = segs.length
  const mobileShown = showMobileAll ? segs : segs.slice(0, INITIAL)

  return (
    <>
      {/* ───────── Cinemática horizontal (desktop) ───────── */}
      <section
        ref={sectionRef}
        className="relative hidden bg-secondary md:block"
        style={{ height: `${N * 100}vh`, overflowAnchor: "none" }}
        aria-label="¿A qué huele tu marca? — categorías"
      >
        <div className="sticky top-0 h-screen overflow-hidden">
          {/* masthead */}
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-[6vw] pt-9">
            <div>
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.4em] text-primary">¿A qué huele tu marca?</p>
              <p className="mt-1 font-serif text-lg text-foreground">Un aroma para cada marca</p>
            </div>
            <span className="font-serif text-sm tracking-[0.22em] text-foreground/40">
              <span ref={counterRef}>01</span> <span className="mx-1 text-primary">/</span> {String(total).padStart(2, "0")}
            </span>
          </div>

          {/* track */}
          <div ref={trackRef} className="flex h-full will-change-transform" style={{ width: `${N * 100}vw` }}>
            {shown.map((seg, i) => (
              <SegmentPanel
                key={seg.key}
                seg={seg}
                i={i}
                pool={pool}
                panelRef={(el) => { panelRefs.current[i] = el }}
              />
            ))}
          </div>

          {/* Botón "Ver más" — continúa la animación con el resto */}
          {total > INITIAL && (
            <button
              onClick={() => setShowAll(true)}
              className="absolute bottom-[12%] left-1/2 z-30 -translate-x-1/2 rounded-full border border-foreground bg-background/80 px-8 py-3.5 text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-foreground shadow-lg backdrop-blur transition-all duration-500 hover:bg-foreground hover:text-background"
              style={{
                opacity: nearEnd ? 1 : 0,
                pointerEvents: nearEnd ? "auto" : "none",
                transform: `translateX(-50%) translateY(${nearEnd ? "0" : "10px"})`,
              }}
            >
              Ver las {total} categorías →
            </button>
          )}

          {/* progreso */}
          <div className="absolute bottom-9 left-[6vw] right-[6vw] z-20 flex items-center gap-5">
            <span className="font-serif text-xs tracking-[0.2em] text-foreground/40">01</span>
            <span className="relative h-px flex-1 overflow-hidden bg-foreground/12">
              <span ref={progressRef} className="absolute inset-0 origin-left bg-primary" style={{ transform: "scaleX(0)" }} />
            </span>
            <span className="font-serif text-xs tracking-[0.2em] text-foreground/40">{String(total).padStart(2, "0")}</span>
          </div>
        </div>
      </section>

      {/* ───────── Fallback vertical (móvil) ───────── */}
      <section className="bg-secondary py-16 md:hidden">
        <div className="px-4">
          <div className="mb-10 text-center">
            <p className="mb-3 text-[0.66rem] font-semibold uppercase tracking-[0.32em] text-primary">¿A qué huele tu marca?</p>
            <h2 className="font-serif text-3xl font-medium leading-tight text-foreground">Un aroma para cada marca</h2>
          </div>
          <div className="space-y-16">
            {mobileShown.map((seg, i) => (
              <MobileCategory key={seg.key} seg={seg} i={i} pool={pool} />
            ))}
          </div>
          {total > INITIAL && !showMobileAll && (
            <div className="mt-12 text-center">
              <button
                onClick={() => setShowMobileAll(true)}
                className="inline-flex items-center gap-2 rounded-full border border-foreground/25 px-8 py-3.5 text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-foreground"
              >
                Ver las {total} categorías
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
