"use client"

import { useRef } from "react"
import { ShoppingBag, Package, Sparkles } from "lucide-react"
import Link from "next/link"

const steps = [
  {
    icon: ShoppingBag,
    number: "01",
    title: "Elige tu aroma",
    description: "Más de 12 fragancias artesanales para el hogar y la ropa. Cada una evoca una emoción distinta. Elige la tuya o regala un kit completo.",
    cta: { label: "Ver colección", href: "/#productos" },
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: Package,
    number: "02",
    title: "Lo recibimos en tu puerta",
    description: "Empaque protegido y sellado, envío a todo Colombia en 3-5 días hábiles. Gratis en compras mayores a $300.000 COP.",
    cta: null,
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: Sparkles,
    number: "03",
    title: "Transforma tu espacio",
    description: "Con solo 3-5 puf tu habitación, ropa o local quedan impregnados durante horas. Sin manchas — solo aroma puro que conecta con la memoria.",
    cta: null,
    color: "bg-primary/10 text-primary",
  },
]

export function HowItWorks() {
  const scrollRef = useRef<HTMLDivElement>(null)

  function scrollToCard(i: number) {
    if (scrollRef.current) {
      const card = scrollRef.current.children[i] as HTMLElement
      if (card) {
        scrollRef.current.scrollTo({ left: card.offsetLeft - scrollRef.current.offsetLeft, behavior: "smooth" })
      }
    }
  }

  return (
    <section id="como-funciona" className="py-20 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-full mb-4">
            Simple como respirar
          </div>
          <h2 className="text-3xl lg:text-4xl font-serif font-bold text-foreground mb-4">
            Cómo funciona
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            De la elección a la transformación en tres pasos. Sin complicaciones.
          </p>
        </div>

        {/* Mobile carousel */}
        <div className="lg:hidden">
          <div
            ref={scrollRef}
            className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 scrollbar-hide"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {steps.map((step, i) => (
              <div
                key={i}
                className="snap-center flex-shrink-0 w-[85vw] flex flex-col items-center text-center bg-background rounded-2xl p-6 shadow-sm border border-border"
              >
                <div className="relative mb-6">
                  <div className={`w-24 h-24 rounded-3xl flex items-center justify-center ${step.color} shadow-sm`}>
                    <step.icon className="w-10 h-10" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-lg font-serif font-bold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{step.description}</p>
                {step.cta && (
                  <Link href={step.cta.href} className="text-sm font-semibold text-primary underline underline-offset-4 hover:text-primary/80 transition-colors">
                    {step.cta.label}
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-4">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToCard(i)}
                className="h-2 w-2 rounded-full bg-primary/30 hover:bg-primary/60 transition-all"
                aria-label={`Ir al paso ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Desktop grid */}
        <div className="hidden lg:grid grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col items-center text-center relative">
              <div className="relative mb-6">
                <div className={`w-24 h-24 rounded-3xl flex items-center justify-center ${step.color} shadow-sm`}>
                  <step.icon className="w-10 h-10" />
                </div>
                <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center">
                  {step.number}
                </span>
              </div>
              <h3 className="text-lg font-serif font-bold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{step.description}</p>
              {step.cta && (
                <Link href={step.cta.href} className="text-sm font-semibold text-primary underline underline-offset-4 hover:text-primary/80 transition-colors">
                  {step.cta.label}
                </Link>
              )}
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
          {["Fórmula sin aceites — no mancha", "Alta concentración · dura hasta 8h", "Hecho en Colombia", "Garantía 30 días"].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
