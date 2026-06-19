"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { SplitText } from "@/components/editorial/split-text"
import { ScrollReveal } from "@/components/editorial/scroll-reveal"
import { Magnetic } from "@/components/magnetic"

/**
 * ProductShowcase3D — vitrina del frasco renderizado en vivo (GLB real de Meshy),
 * girando sobre su eje. Split editorial: el render 3D a la izquierda, el copy de
 * objeto-de-deseo con llamados a la acción a la derecha.
 */
const MeshyViewer = dynamic(
  () => import("@/components/meshy-viewer").then((m) => m.MeshyViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-square w-full items-center justify-center">
        <div className="h-14 w-14 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    ),
  }
)

// Frasco protagonista de la vitrina (render 3D real)
const SHOWCASE_MODEL = "/models/luxury.glb"

export function ProductShowcase3D() {
  return (
    <section className="overflow-hidden bg-secondary">
      <div className="container mx-auto grid grid-cols-1 items-center gap-10 px-4 py-20 md:grid-cols-2 md:py-28">
        {/* Render 3D real, girando */}
        <ScrollReveal distance={32}>
          <div className="relative mx-auto aspect-square w-full max-w-[460px]">
            <MeshyViewer url={SHOWCASE_MODEL} />
            <p className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-[0.6rem] font-medium uppercase tracking-[0.28em] text-muted-foreground/70">
              Arrastra para girar
            </p>
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
            Vidrio ámbar, proporción cuidada y un aroma que se queda. Cada frasco
            está pensado para vivir a la vista —en la repisa de tu local, la
            recepción del hotel o la mesa del spa— y reforzar la identidad de tu
            marca en cada visita.
          </p>

          {/* Beneficios rápidos */}
          <ul className="mx-auto mt-7 flex max-w-md flex-wrap justify-center gap-x-6 gap-y-2 md:mx-0 md:justify-start">
            {["250 ml · alta concentración", "Etiqueta personalizable", "100% natural"].map((b) => (
              <li key={b} className="flex items-center gap-2 text-xs tracking-wide text-foreground/75">
                <span className="h-1 w-1 rounded-full bg-primary" />
                {b}
              </li>
            ))}
          </ul>

          {/* Llamados a la acción */}
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4 md:justify-start">
            <Magnetic>
              <Link
                href="/catalogo"
                className="inline-flex items-center justify-center bg-foreground px-9 py-3.5 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-background transition-colors hover:bg-primary"
              >
                Elegir mi aroma
              </Link>
            </Magnetic>
            <Link
              href="/catalogo?categoria=all"
              className="inline-flex items-center justify-center border border-foreground/30 px-9 py-3.5 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-foreground transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
            >
              Ver la colección
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
