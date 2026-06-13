import Link from "next/link"
import { Product3D } from "@/components/editorial/product-3d"
import { SplitText } from "@/components/editorial/split-text"
import { ScrollReveal } from "@/components/editorial/scroll-reveal"
import { Magnetic } from "@/components/magnetic"

/**
 * ProductShowcase3D — vitrina del frasco renderizado en vivo. Split editorial:
 * el render 3D interactivo a la izquierda (gira solo, persigue el mouse),
 * el copy de objeto-de-deseo a la derecha.
 */
export function ProductShowcase3D() {
  return (
    <section className="overflow-hidden bg-secondary">
      <div className="container mx-auto grid grid-cols-1 items-center gap-10 px-4 py-20 md:grid-cols-2 md:py-28">
        {/* Render vivo */}
        <ScrollReveal distance={32}>
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[440px]">
            <Product3D className="absolute inset-0" />
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
            noche o el recibidor. Gíralo — es tuyo.
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
