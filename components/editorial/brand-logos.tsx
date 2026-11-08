"use client"

/**
 * BrandLogos — social proof B2B: marcas que ya trabajan con Cliché. Tira de
 * logotipos que se desplaza horizontalmente en loop infinito, sin fondo (los
 * logos se funden con la sección vía mix-blend). Logos oficiales de
 * clichecolombia.com. Respeta prefers-reduced-motion (queda estático centrado).
 * La lista vive en lib/brands.ts (la usan también componentes de servidor).
 */
import { BRANDS } from "@/lib/brands"

export { BRANDS }

function Logo({ src, alt }: { src: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      // Más grandes y protagonistas (pedido del cliente 2026-08-26); el
      // mix-blend multiply funde el fondo blanco del logo con la sección.
      className="h-10 w-auto max-w-[180px] shrink-0 object-contain opacity-85 [mix-blend-mode:multiply] transition-opacity duration-500 hover:opacity-100 md:h-14 md:max-w-[240px]"
    />
  )
}

export function BrandLogos() {
  return (
    <section className="overflow-hidden border-y border-border/50 bg-background py-8 md:py-10">
      <div className="container mx-auto px-4">
        <p className="mb-6 text-center text-base font-semibold tracking-tight text-primary md:mb-8 md:text-xl">
          Más de 40 marcas ya tienen su aroma Cliché
        </p>
      </div>

      {/* Tira en loop: máscara con desvanecido en los bordes */}
      <div
        className="relative flex w-full"
        style={{ maskImage: "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)", WebkitMaskImage: "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)" }}
      >
        <div className="brand-track flex w-max shrink-0 items-center gap-14 pr-14 md:gap-20 md:pr-20">
          {BRANDS.map((b) => <Logo key={b.src} {...b} />)}
        </div>
        <div aria-hidden className="brand-track flex w-max shrink-0 items-center gap-14 pr-14 md:gap-20 md:pr-20">
          {BRANDS.map((b) => <Logo key={`dup-${b.src}`} {...b} />)}
        </div>
      </div>

      <style jsx>{`
        .brand-track {
          animation: brand-marquee 34s linear infinite;
        }
        @keyframes brand-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-100%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .brand-track { animation: none; }
        }
      `}</style>
    </section>
  )
}
