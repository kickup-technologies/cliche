"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { SplitText } from "@/components/editorial/split-text"

/**
 * Faq — manejo de objeciones (penúltima etapa del embudo). Cada pregunta
 * responde un freno de compra real: miedo a manchar, duración, seguridad,
 * logística y pago. Acordeón con animación grid-rows (suave, sin medir
 * alturas) e icono + que rota a ×.
 */
const QA = [
  {
    q: "¿Venden por unidad o en kits para mi marca?",
    a: "Ambos. Cada aroma se ofrece por unidad ($78.000) o en kits del mismo aroma: x3 ($145.000), x4 ($190.000) y x6 ($280.000), con mejor precio por frasco — ideal para abastecer tu negocio.",
  },
  {
    q: "¿Mancha las prendas o la mercancía?",
    a: "No. La fórmula no contiene aceites grasos ni colorantes: puedes rociarla sobre prendas, telas, empaques y mobiliario claro sin dejar residuo.",
  },
  {
    q: "¿Cuánto dura el aroma?",
    a: "La alta concentración hace que unos pocos pufs perfumen tu local o cada prenda que despachas durante horas — en textiles, el aroma acompaña a tu cliente todo el día.",
  },
  {
    q: "¿Hacen aroma personalizado para mi marca?",
    a: "Sí. Diseñamos identidades olfativas a la medida para marcas, tiendas, hoteles y spas. Cuéntanos sobre tu marca y lo coordinamos con el equipo.",
  },
  {
    q: "¿Hacen envíos a todo el país?",
    a: "Despachamos a toda Colombia con transportadoras aliadas: flete de $20.500 (entrega de 7 a 9 días hábiles) y gratis en pedidos desde $300.000.",
  },
  {
    q: "¿Cómo puedo pagar?",
    a: "Aceptamos tarjetas débito y crédito y los medios de la pasarela de pago certificada de nuestro checkout. Todas las transacciones viajan cifradas.",
  },
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className="bg-background py-20 md:py-28">
      <div className="container mx-auto max-w-3xl px-4">
        <div className="mb-12 text-center">
          <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary">
            Antes de comprar
          </p>
          <SplitText
            text="Preguntas frecuentes"
            as="h2"
            className="font-serif text-3xl font-medium text-foreground md:text-4xl"
          />
        </div>

        <div className="divide-y divide-border border-y border-border">
          {QA.map((item, i) => {
            const isOpen = open === i
            return (
              <div key={i}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-6 py-5 text-left transition-colors hover:text-primary"
                >
                  <span className="font-serif text-lg font-medium text-foreground md:text-xl">
                    {item.q}
                  </span>
                  <Plus
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ${
                      isOpen ? "rotate-45" : ""
                    }`}
                  />
                </button>
                <div
                  className="grid transition-[grid-template-rows] duration-400 ease-out"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <p className="pb-6 pr-10 text-sm leading-relaxed text-muted-foreground">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
