"use client"

import { useState } from "react"
import Link from "next/link"
import { Sparkles, ArrowRight } from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { WhatsAppButton } from "@/components/whatsapp-button"
import { PackBuilder } from "@/components/pack-builder"
import { PRICE_TIERS, UNIT_PRICE } from "@/lib/pricing"

const CREMA = "#FAF8F5"
const CAFE = "#2D1A14"
const TERRA = "#A67163"

const KIT_TIERS = PRICE_TIERS.filter((t) => t.units > 1)
const fmt = (n: number) => `$${n.toLocaleString("es-CO")}`

const STEPS = [
  { n: "01", t: "Elige el tamaño", d: "Kit de 3, 4 o 6 frascos." },
  { n: "02", t: "Combina aromas", d: "Mezcla tus favoritos, sin repetir si no quieres." },
  { n: "03", t: "Mismo precio del kit", d: "El precio especial se mantiene, elijas lo que elijas." },
]

export default function ArmaTuKitPage() {
  const [open, setOpen] = useState(false)

  return (
    <main className="min-h-screen" style={{ backgroundColor: CREMA }}>
      <Header />

      <section className="px-5 pb-24 pt-28 sm:pt-36">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5" style={{ borderColor: `${CAFE}1F` }}>
            <Sparkles className="h-3.5 w-3.5" style={{ color: TERRA }} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.34em]" style={{ color: TERRA }}>
              Kit personalizado
            </span>
          </div>

          <h1 className="font-serif text-5xl leading-[1.03] sm:text-7xl" style={{ color: CAFE }}>
            Arma el kit
            <br />
            <span style={{ color: TERRA }}>que es solo tuyo</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed sm:text-base" style={{ color: `${CAFE}99` }}>
            Combina diferentes aromas en un solo kit y llévate el precio especial.
            Tú decides la mezcla; nosotros la preparamos.
          </p>

          <button
            onClick={() => setOpen(true)}
            className="group mt-9 inline-flex items-center gap-2 rounded-full px-9 py-4 text-sm font-semibold transition-all hover:gap-3"
            style={{ backgroundColor: CAFE, color: CREMA }}
          >
            Empezar a armar mi kit
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* Tamaños */}
        <div className="mx-auto mt-16 grid max-w-3xl gap-4 sm:grid-cols-3">
          {KIT_TIERS.map((t) => (
            <button
              key={t.id}
              onClick={() => setOpen(true)}
              className="rounded-3xl border bg-white p-7 text-left transition-all hover:-translate-y-1 hover:shadow-lg"
              style={{ borderColor: `${CAFE}14` }}
            >
              {t.badge && (
                <span className="mb-3 inline-block rounded-full px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide" style={{ backgroundColor: TERRA, color: CREMA }}>
                  {t.badge}
                </span>
              )}
              <p className="font-serif text-4xl" style={{ color: CAFE }}>Kit x{t.units}</p>
              <p className="mt-2 text-lg font-semibold" style={{ color: CAFE }}>{fmt(t.price)}</p>
              <p className="mt-1 text-xs line-through" style={{ color: `${CAFE}66` }}>{fmt(t.units * UNIT_PRICE)}</p>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide" style={{ color: TERRA }}>
                {t.units} aromas a elegir →
              </p>
            </button>
          ))}
        </div>

        {/* Cómo funciona */}
        <div className="mx-auto mt-20 grid max-w-4xl gap-8 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n}>
              <p className="font-serif text-3xl" style={{ color: TERRA }}>{s.n}</p>
              <p className="mt-2 font-semibold" style={{ color: CAFE }}>{s.t}</p>
              <p className="mt-1 text-sm" style={{ color: `${CAFE}99` }}>{s.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link href="/catalogo" className="text-xs uppercase tracking-widest underline-offset-4 hover:underline" style={{ color: `${CAFE}80` }}>
            Ver todos los aromas
          </Link>
        </div>
      </section>

      <Footer />
      <WhatsAppButton />

      <PackBuilder open={open} onClose={() => setOpen(false)} />
    </main>
  )
}
