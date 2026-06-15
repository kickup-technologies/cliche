import { Leaf, ShieldCheck, Truck, Sparkles } from "lucide-react"
import { ScrollReveal } from "@/components/editorial/scroll-reveal"

/**
 * Guarantees — reversión de riesgo (etapa final del embudo, justo antes de
 * las objeciones). Cuatro promesas concretas que desactivan el miedo a
 * comprar. Iconos con micro-animación en hover; entrada escalonada.
 */
const ITEMS = [
  {
    icon: Leaf,
    title: "100% Natural",
    text: "Sin parabenos ni aceites grasos. Seguro para tus clientes y tus productos.",
  },
  {
    icon: Sparkles,
    title: "No mancha",
    text: "Probado en textiles claros y delicados. Cero residuos.",
  },
  {
    icon: Truck,
    title: "Envío nacional",
    text: "Despachamos a toda Colombia. Gratis desde $300.000.",
  },
  {
    icon: ShieldCheck,
    title: "Pago protegido",
    text: "Checkout cifrado y pasarela certificada. Compra tranquila.",
  },
]

export function Guarantees() {
  return (
    <section className="border-y border-border bg-background py-14 md:py-16">
      <div className="container mx-auto grid grid-cols-2 gap-x-6 gap-y-10 px-4 md:grid-cols-4">
        {ITEMS.map((item, i) => {
          const Icon = item.icon
          return (
            <ScrollReveal key={item.title} delay={i * 110} distance={28}>
              <div className="group text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border text-primary transition-all duration-500 group-hover:-translate-y-1 group-hover:border-primary group-hover:bg-primary group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-foreground">
                  {item.title}
                </h3>
                <p className="mx-auto mt-2 max-w-[200px] text-xs leading-relaxed text-muted-foreground">
                  {item.text}
                </p>
              </div>
            </ScrollReveal>
          )
        })}
      </div>
    </section>
  )
}
