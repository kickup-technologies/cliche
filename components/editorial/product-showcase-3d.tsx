import Link from "next/link"
import Image from "next/image"
import { SplitText } from "@/components/editorial/split-text"
import { ScrollReveal } from "@/components/editorial/scroll-reveal"
import { Magnetic } from "@/components/magnetic"

/**
 * ProductShowcase3D — vitrina del frasco real. Split editorial: el render
 * oficial del producto a la izquierda (fondo blanco fundido con la sección
 * vía mix-blend-multiply), el copy de objeto-de-deseo a la derecha.
 */
export function ProductShowcase3D() {
  return (
    <section className="overflow-hidden bg-secondary">
      <div className="container mx-auto grid grid-cols-1 items-center gap-10 px-4 py-20 md:grid-cols-2 md:py-28">
        {/* Render oficial */}
        <ScrollReveal distance={32}>
          <div className="group relative mx-auto aspect-[4/5] w-full max-w-[440px]">
            <Image
              src="/images/products/calor-de-lana.png"
              alt="Frasco Calor de Lana — Bienestar by Cliché"
              fill
              sizes="(max-width: 768px) 100vw, 440px"
              className="object-contain mix-blend-multiply transition-transform duration-[1.1s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
            />
          </div>
        </ScrollReveal>

        {/* Copy */}
        <div className="text-center md:text-left">
          <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary">
            Diseñado para exhibirse
          </p>
          <SplitText
            text="Un objeto que perfuma hasta sin abrirse"
            as="h2"
            className="font-serif text-3xl font-medium leading-tight text-foreground md:text-5xl"
          />
          <p className="mx-auto mt-6 max-w-md text-sm font-light leading-relaxed text-muted-foreground md:mx-0 md:text-base">
            Vidrio, proporción y un aroma que se queda. Cada frasco está
            pensado para vivir a la vista: en la repisa del baño, la mesa de
            noche o el recibidor. Hazlo tuyo.
          </p>
          <Magnetic className="mt-9">
            <Link
              href="/catalogo"
              className="inline-flex items-center justify-center border border-foreground px-9 py-3.5 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              Elegir mi aroma
            </Link>
          </Magnetic>
        </div>
      </div>
    </section>
  )
}
