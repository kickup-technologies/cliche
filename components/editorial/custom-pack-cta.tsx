"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Sparkles, ArrowRight } from "lucide-react"
import { PackBuilder } from "@/components/pack-builder"
import { PRICE_TIERS } from "@/lib/pricing"

const CREMA = "#FAF8F5"
const CAFE = "#2D1A14"
const TERRA = "#A67163"

const KIT_TIERS = PRICE_TIERS.filter((t) => t.units > 1)

/**
 * CustomPackCTA — sección del landing que invita a armar un kit a medida
 * combinando aromas distintos. Abre el PackBuilder directamente. Reveal al
 * entrar en viewport. Pensada para ir entre los segmentos y los testimonios.
 */
export function CustomPackCTA() {
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState(false)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect() } },
      { threshold: 0.2 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section
      ref={ref}
      className="relative overflow-hidden px-5 py-20 sm:py-28"
      style={{ backgroundColor: CAFE }}
    >
      {/* Frascos flotando de fondo */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07]">
        <div className="absolute -left-10 top-6 h-48 w-48 rotate-12">
          <Image src="/images/products/tao.png" alt="" fill className="object-contain" sizes="200px" />
        </div>
        <div className="absolute -right-8 bottom-2 h-56 w-56 -rotate-12">
          <Image src="/images/products/luxury.png" alt="" fill className="object-contain" sizes="220px" />
        </div>
      </div>

      <div
        className="relative mx-auto max-w-3xl text-center transition-all duration-700"
        style={{
          opacity: shown ? 1 : 0,
          transform: shown ? "translateY(0)" : "translateY(28px)",
        }}
      >
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-1.5" style={{ borderColor: `${CREMA}33` }}>
          <Sparkles className="h-3.5 w-3.5" style={{ color: TERRA }} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.34em]" style={{ color: `${CREMA}CC` }}>
            Hecho a tu medida
          </span>
        </div>

        <h2 className="font-serif text-4xl leading-[1.05] sm:text-6xl" style={{ color: CREMA }}>
          Crea tu pack
          <br />
          <span style={{ color: TERRA }}>a tu manera</span>
        </h2>

        <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed sm:text-base" style={{ color: `${CREMA}B3` }}>
          No tienes que elegir un solo aroma. Combina tus favoritos en un kit de 3, 4 o 6
          frascos —los que tú quieras— y llévate el mismo precio especial del kit.
        </p>

        {/* Mini-tabla de tamaños */}
        <div className="mx-auto mt-8 flex max-w-md items-stretch justify-center gap-3">
          {KIT_TIERS.map((t) => (
            <div
              key={t.id}
              className="flex-1 rounded-2xl border px-3 py-4"
              style={{ borderColor: `${CREMA}1F`, backgroundColor: `${CREMA}0A` }}
            >
              <p className="font-serif text-2xl" style={{ color: CREMA }}>x{t.units}</p>
              <p className="mt-1 text-[11px]" style={{ color: `${CREMA}99` }}>
                ${t.price.toLocaleString("es-CO")}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={() => setOpen(true)}
          className="group mt-9 inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-semibold transition-all hover:gap-3"
          style={{ backgroundColor: TERRA, color: CREMA }}
        >
          Empezar a armar mi kit
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>

      <PackBuilder open={open} onClose={() => setOpen(false)} />
    </section>
  )
}
