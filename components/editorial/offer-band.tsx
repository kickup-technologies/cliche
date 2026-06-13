import Link from "next/link"
import { Truck } from "lucide-react"
import { SplitText } from "@/components/editorial/split-text"
import { Magnetic } from "@/components/magnetic"

/**
 * OfferBand — etapa de oferta/urgencia del embudo. Banda oscura de alto
 * contraste con el incentivo concreto (envío gratis) y un único CTA.
 * Sin imagen: el cambio brusco de fondo tras secciones claras detiene el
 * scroll y enfoca la decisión.
 */
export function OfferBand() {
  return (
    <section className="bg-foreground py-20 text-background md:py-28">
      <div className="container mx-auto px-4 text-center">
        <p className="mb-4 flex items-center justify-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-background/70">
          <Truck className="h-4 w-4" />
          Por tiempo limitado
        </p>
        <SplitText
          text="Envío gratis desde $300.000"
          as="h2"
          className="font-serif text-3xl font-medium leading-tight md:text-5xl"
        />
        <p className="mx-auto mt-5 max-w-md text-sm font-light leading-relaxed text-background/80 md:text-base">
          Arma tu ritual completo y nosotros lo llevamos hasta tu puerta,
          en cualquier ciudad de Colombia.
        </p>
        <Magnetic className="mt-9">
          <Link
            href="/catalogo"
            className="inline-flex items-center justify-center border border-background px-10 py-4 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-background transition-colors hover:bg-background hover:text-foreground"
          >
            Armar mi pedido
          </Link>
        </Magnetic>
      </div>
    </section>
  )
}
