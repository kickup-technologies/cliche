import Link from "next/link"
import { ScrollReveal } from "@/components/editorial/scroll-reveal"
import { SplitText } from "@/components/editorial/split-text"

/**
 * ValuesColumns — multi-columna "En lo que creemos" (estilo renesme).
 * Valores de marca en columnas con número, título serif y descripción.
 */
interface ValueItem {
  title: string
  text: string
}

const VALUES: ValueItem[] = [
  {
    title: "100% Natural",
    text: "Sin parabenos ni aceites grasos. Fórmulas seguras para tus clientes, tus prendas y tus espacios.",
  },
  {
    title: "Hecho en Colombia",
    text: "Aromas artesanales creados localmente, con identidad y alma para tu marca.",
  },
  {
    title: "Dura todo el día",
    text: "Alta concentración: unos pufs perfuman tu local, tu producto o tu evento por horas.",
  },
]

export function ValuesColumns() {
  return (
    <section id="nosotros" className="bg-secondary py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mb-14 text-center">
          <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary">
            En lo que creemos
          </p>
          <SplitText
            text="Más que un aroma, una firma de marca"
            as="h2"
            className="font-serif text-3xl font-medium text-foreground md:text-4xl"
          />
        </div>

        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          {VALUES.map((v, i) => (
            <ScrollReveal key={v.title} delay={i * 140} distance={40}>
              <div className="text-center">
                <span className="font-serif text-2xl font-medium text-primary">
                  0{i + 1}
                </span>
                <div className="mx-auto my-5 h-px w-10 bg-border" />
                <h3 className="font-serif text-xl font-medium text-foreground">{v.title}</h3>
                <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  {v.text}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Las razones para creer cierran con acción (más CTAs en el embudo) */}
        <ScrollReveal delay={420}>
          <div className="mt-14 text-center">
            <Link
              href="/catalogo"
              className="inline-flex items-center justify-center bg-foreground px-9 py-3.5 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-background transition-colors hover:bg-primary"
            >
              Descubre tu aroma
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
