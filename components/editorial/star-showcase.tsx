"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"
import type { Product } from "@/lib/supabase"

/**
 * StarShowcase — exposición de aromas estrella (layout ref: buckssauce.com,
 * paleta Cliché). Transición coreografiada: al pulsar una flecha, las flechas
 * desaparecen, el frasco vuela hacia el lado del botón encogiéndose hasta
 * desvanecerse y luego entra el siguiente. Efecto imán: el frasco sigue
 * brevemente al cursor. Leve tilt + levitación continua.
 */
const STAR_SLUGS = ["dulce-lana", "agua", "eternamente-indigo", "sello-de-dios", "luxury", "tao"]
const EXIT_MS = 820
const ENTER_MS = 760

function baseSlug(slug: string) {
  return slug.replace(/^aroma-/, "")
}
function fmt(n: number) {
  return n.toLocaleString("es-CO")
}

export function StarShowcase() {
  const [pool, setPool] = useState<Product[]>([])
  const [active, setActive] = useState(0)
  const [phase, setPhase] = useState<"idle" | "exiting" | "entering">("idle")
  const [dir, setDir] = useState(1)
  const [paused, setPaused] = useState(false)
  const [mag, setMag] = useState({ x: 0, y: 0 })
  const stageRef = useRef<HTMLDivElement>(null)

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

  // refs para timers/handlers sin closures obsoletos
  const phaseRef = useRef(phase); phaseRef.current = phase
  const activeRef = useRef(active); activeRef.current = active
  const lenRef = useRef(stars.length); lenRef.current = stars.length

  useEffect(() => { if (active >= stars.length) setActive(0) }, [stars.length, active])

  const run = useCallback((next: number, d: number) => {
    if (phaseRef.current !== "idle") return
    setDir(d)
    setPhase("exiting")
    setMag({ x: 0, y: 0 })
    window.setTimeout(() => {
      setActive(next)
      setPhase("entering")
      window.setTimeout(() => setPhase("idle"), ENTER_MS)
    }, EXIT_MS)
  }, [])

  const change = useCallback((d: number) => {
    const n = lenRef.current
    if (n < 2) return
    run((activeRef.current + d + n) % n, d)
  }, [run])

  useEffect(() => {
    if (paused || stars.length < 2) return
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const t = setInterval(() => change(1), 7000)
    return () => clearInterval(t)
  }, [paused, stars.length, change])

  // Imán: el frasco sigue brevemente al cursor cuando pasa cerca
  const onMove = (e: React.MouseEvent) => {
    if (phaseRef.current !== "idle" || !stageRef.current) return
    const r = stageRef.current.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const clamp = (v: number) => Math.max(-22, Math.min(22, v))
    setMag({ x: clamp((e.clientX - cx) * 0.13), y: clamp((e.clientY - cy) * 0.13) })
  }
  const onLeave = () => setMag({ x: 0, y: 0 })

  if (stars.length === 0) return null
  const cur = stars[active] ?? stars[0]
  const buttonsVisible = phase === "idle"

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

        <div className="relative mx-auto max-w-6xl">
          {/* Etiquetas sobre línea punteada */}
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

          {/* Stage */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-[#2D1A14]/15" />

            <button
              onClick={() => change(-1)}
              aria-label="Aroma anterior"
              style={{ opacity: buttonsVisible ? 1 : 0, pointerEvents: buttonsVisible ? "auto" : "none" }}
              className="absolute left-0 z-20 flex h-16 w-16 items-center justify-center rounded-full bg-[#2D1A14] text-[#FAF8F5] shadow-lg transition-all duration-300 hover:bg-[#A67163] md:h-[88px] md:w-[88px]"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div
              ref={stageRef}
              onMouseMove={onMove}
              onMouseLeave={onLeave}
              className="relative z-10 mx-auto h-[420px] w-full max-w-[480px] md:h-[560px] md:max-w-[520px]"
            >
              {/* Círculo terracota (palpita) + sombra */}
              <div className="star-circle absolute left-1/2 top-1/2 h-[300px] w-[300px] rounded-full bg-[#A67163] md:h-[440px] md:w-[440px]" />
              <div className="absolute bottom-8 left-1/2 h-5 w-44 -translate-x-1/2 rounded-[50%] bg-[#2D1A14]/15 blur-xl" />

              {/* Frasco: wrapper(exit/enter) > middle(imán) > img(tilt+float) */}
              <div
                key={active}
                className={`absolute inset-0 ${phase === "entering" ? "star-enter" : ""}`}
                style={{
                  transition: phase === "exiting" ? `transform ${EXIT_MS}ms cubic-bezier(0.55,0,0.85,0.2), opacity ${EXIT_MS}ms ease` : undefined,
                  transform: phase === "exiting" ? `translateX(${dir * 340}px) scale(0.1)` : undefined,
                  opacity: phase === "exiting" ? 0 : 1,
                }}
              >
                <div
                  className="h-full w-full"
                  style={{ transform: `translate(${mag.x}px, ${mag.y}px)`, transition: "transform 280ms ease-out" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cur.cutout}
                    alt={cur.product.name}
                    onError={(e) => { e.currentTarget.src = cur.product.image_url || "/placeholder-product.jpg" }}
                    className="star-bottle h-full w-full object-contain drop-shadow-2xl"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => change(1)}
              aria-label="Siguiente aroma"
              style={{ opacity: buttonsVisible ? 1 : 0, pointerEvents: buttonsVisible ? "auto" : "none" }}
              className="absolute right-0 z-20 flex h-16 w-16 items-center justify-center rounded-full bg-[#2D1A14] text-[#FAF8F5] shadow-lg transition-all duration-300 hover:bg-[#A67163] md:h-[88px] md:w-[88px]"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>

          {/* Botón Comprar superpuesto + precio + dots */}
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
                  onClick={() => i !== active && run(i, i > activeRef.current ? 1 : -1)}
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
        .star-circle { animation: star-pulse 3.4s ease-in-out infinite; }
        @keyframes star-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.06); }
        }
        .star-bottle { animation: star-float 4.5s ease-in-out infinite; transform-origin: center bottom; }
        @keyframes star-float {
          0%, 100% { transform: rotate(-7deg) translateY(0); }
          50% { transform: rotate(-7deg) translateY(-16px); }
        }
        .star-enter { animation: star-enter ${ENTER_MS}ms cubic-bezier(0.22,1,0.36,1); }
        @keyframes star-enter {
          0% { opacity: 0; transform: scale(0.7); }
          100% { opacity: 1; transform: scale(1); }
        }
        .star-fade { animation: star-fade-in 0.6s ease; }
        @keyframes star-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .star-bottle { animation: none; transform: rotate(-7deg); }
          .star-circle { animation: none; transform: translate(-50%, -50%); }
        }
      `}</style>
    </section>
  )
}
