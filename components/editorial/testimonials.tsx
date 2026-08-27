"use client"

import Link from "next/link"
import { Star } from "lucide-react"
import { SplitText } from "@/components/editorial/split-text"

/**
 * Testimonials — prueba social en marquee de cards (etapa de confianza del
 * embudo). Dos filas que se desplazan en direcciones opuestas y se pausan en
 * hover; cada card tiene una rotación leve que se endereza al pasar el mouse,
 * dando un aire editorial y juguetón sin perder elegancia.
 */
interface Review {
  name: string
  city: string
  text: string
  product: string
}

const REVIEWS: Review[] = [
  { name: "Mariana G.", city: "Boutique · Bogotá", text: "Mis clientas entran y lo primero que dicen es '¿qué huele tan rico?'. Ahora la tienda tiene su sello.", product: "Brillos de Seda" },
  { name: "Catalina R.", city: "Ropa infantil · Medellín", text: "Perfumo cada prenda antes de empacarla. No mancha y las mamás aman el detalle.", product: "Vientos de Lino" },
  { name: "Andrés P.", city: "Hotel boutique · Cali", text: "Pedí uno de prueba para el lobby y terminé aromatizando todo el hotel. Los huéspedes preguntan por él.", product: "Tierra" },
  { name: "Laura V.", city: "Accesorios · Barranquilla", text: "Cada pedido sale con su aroma y una nota. Mis clientas vuelven solo por la experiencia.", product: "Romeo y Julieta" },
  { name: "Daniela M.", city: "Spa · Bogotá", text: "Mis clientas se relajan apenas entran. El aroma ya es parte de mi servicio.", product: "Sello de Dios" },
  { name: "Juliana S.", city: "Tienda de regalos · Pereira", text: "Llegó en dos días y rinde muchísimo. Lo uso en toda la tienda y todavía me sobra.", product: "Dulce Lana" },
  { name: "Camila T.", city: "Marca deportiva · Bucaramanga", text: "Probé mil aromatizantes y ninguno dura como este en la ropa. Ya es parte de mi marca.", product: "Eternamente Índigo" },
  { name: "Valentina H.", city: "Marca premium · Cartagena", text: "El aroma es elegante, no empalagoso. Le da a mi marca ese aire caro que buscaba.", product: "Luxury" },
]

function ReviewCard({ review, tilt }: { review: Review; tilt: number }) {
  return (
    <figure
      className="group/card mx-3 w-[300px] shrink-0 border border-border bg-background p-6 transition-transform duration-500 ease-out hover:-translate-y-1.5 hover:rotate-0 hover:shadow-lg md:w-[340px]"
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      <div className="flex gap-0.5 text-primary">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="h-3.5 w-3.5 fill-current" />
        ))}
      </div>
      <blockquote className="mt-4 font-serif text-[1.05rem] leading-relaxed text-foreground">
        “{review.text}”
      </blockquote>
      <figcaption className="mt-5 flex items-baseline justify-between gap-3">
        <span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-foreground">
          {review.name} · {review.city}
        </span>
        <span className="truncate text-[0.64rem] uppercase tracking-[0.12em] text-muted-foreground">
          {review.product}
        </span>
      </figcaption>
    </figure>
  )
}

export function Testimonials() {
  const rowA = REVIEWS.slice(0, 4)
  const rowB = REVIEWS.slice(4)
  // tilt alternado leve para el aire "polaroid sobre la mesa"
  const tilts = [-1.4, 1.1, -0.8, 1.6]

  return (
    <section className="overflow-hidden bg-secondary py-20 md:py-28">
      <div className="container mx-auto mb-12 px-4 text-center">
        <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary">
          Marcas colombianas con su propio aroma
        </p>
        <SplitText
          text="Marcas que ya tienen el suyo"
          as="h2"
          className="font-serif text-3xl font-medium text-foreground md:text-4xl"
        />
      </div>

      {/* Fila A — hacia la izquierda */}
      <div className="testimonial-row group flex">
        <div className="testimonial-track flex w-max py-3 [animation:testi-left_46s_linear_infinite] group-hover:[animation-play-state:paused]">
          {[...rowA, ...rowA, ...rowA].map((r, i) => (
            <ReviewCard key={`a-${i}`} review={r} tilt={tilts[i % 4]} />
          ))}
        </div>
      </div>

      {/* Fila B — hacia la derecha */}
      <div className="testimonial-row group mt-2 flex">
        <div className="testimonial-track flex w-max py-3 [animation:testi-right_52s_linear_infinite] group-hover:[animation-play-state:paused]">
          {[...rowB, ...rowB, ...rowB].map((r, i) => (
            <ReviewCard key={`b-${i}`} review={r} tilt={tilts[(i + 2) % 4]} />
          ))}
        </div>
      </div>

      {/* CTA: la prueba social ahora empuja a la acción (más CTAs en el
          embudo — feedback del cliente 2026-08-26) */}
      <div className="container mx-auto mt-12 px-4 text-center">
        <Link
          href="/catalogo"
          className="inline-flex items-center justify-center bg-foreground px-9 py-3.5 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-background transition-colors hover:bg-primary"
        >
          Quiero mi aroma
        </Link>
      </div>

      <style jsx global>{`
        @keyframes testi-left {
          from { transform: translateX(0); }
          to   { transform: translateX(-33.333%); }
        }
        @keyframes testi-right {
          from { transform: translateX(-33.333%); }
          to   { transform: translateX(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .testimonial-track { animation: none !important; }
        }
      `}</style>
    </section>
  )
}
