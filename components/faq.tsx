"use client"

import { useState } from "react"
import { ChevronDown, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const faqs = [
  {
    q: "¿Cuánto dura el aroma?",
    a: "En espacios cerrados el efecto olfativo se mantiene hasta 8 horas. En ropa, la fragancia persiste entre 1 y 3 días según el tipo de tela. En espacios ventilados recomendamos reaplicar cada 4-6 horas para una experiencia constante.",
  },
  {
    q: "¿Mancha la ropa o las superficies?",
    a: "No. La fórmula de Cliché es a base de agua y alcohol etílico, sin aceites grasos ni colorantes que transfieran. Puedes aplicar directamente sobre telas blancas, tapicería y cualquier prenda sin riesgo de manchas.",
  },
  {
    q: "¿Cómo puedo pagar?",
    a: "Aceptamos tarjetas de crédito y débito (Visa, Mastercard), PSE y transferencia bancaria. El pago es procesado por Wompi (Bancolombia) con cifrado SSL — tus datos financieros nunca tocan nuestros servidores.",
  },
  {
    q: "¿Cuánto cuesta el envío y cuánto tarda?",
    a: "El envío cuesta $12.000 COP y llega en 3-5 días hábiles a toda Colombia. En compras mayores a $300.000 COP el envío es completamente gratis. Para Bogotá, Medellín, Cali y Barranquilla generalmente llega en 2-3 días. Una vez despachado recibirás un correo con número de rastreo.",
  },
  {
    q: "¿En qué superficies puedo usar el aroma?",
    a: "Los aromas Cliché funcionan perfectamente en ropa (algodón, lino, sintéticos), espacios cerrados (habitaciones, oficinas, locales), textiles del hogar (cortinas, cojines, sábanas) y empaque de productos. No se recomienda aplicar sobre cuero o seda delicada.",
  },
  {
    q: "¿Tienen garantía de devolución?",
    a: "Sí. Si por cualquier motivo el producto no cumple tus expectativas, tienes 30 días para solicitar cambio o devolución sin preguntas. Escríbenos por WhatsApp o al correo monica@clichecolombia.com y lo resolvemos de inmediato.",
  },
  {
    q: "¿El código BIENVENIDA10 tiene restricciones?",
    a: "El código BIENVENIDA10 da un 10% de descuento sobre el valor de los productos de tu primera compra (el descuento no aplica al costo de envío). Solo puede usarse una vez por cliente y requiere iniciar sesión. Válido hasta agotar existencias de la promoción.",
  },
  {
    q: "¿Cómo uso exactamente el aroma? ¿Cuántos pufs aplico?",
    a: "Para una habitación normal (12-20 m²), aplica 3-5 pufs directamente al aire o sobre textiles (sofá, cojines, cortinas, ropa de cama). El aroma en el ambiente dura 2-4 horas; en textiles puede durar todo el día. No es necesario aplicar más — con Cliché menos es más.",
  },
  {
    q: "¿Es seguro para niños y mascotas?",
    a: "Sí. La fórmula no contiene alérgenos clasificados, colorantes artificiales ni aceites pesados. Al aplicarse, el alcohol portador se evapora en segundos dejando solo la fragancia. Puedes usarlo en espacios donde estén niños y mascotas sin problema.",
  },
]

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section id="faq" className="py-20 bg-background">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-full mb-4">
            <HelpCircle className="w-3.5 h-3.5" />
            Resolvemos tus dudas
          </div>
          <h2 className="text-3xl lg:text-4xl font-serif font-bold text-shimmer mb-4">
            Preguntas frecuentes
          </h2>
          <span className="accent-rule" />
          <p className="text-muted-foreground">
            Todo lo que necesitas saber antes de tu primera compra.
          </p>
        </div>

        {/* Accordion */}
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className={cn(
                "border border-border rounded-2xl overflow-hidden transition-all duration-200",
                open === i ? "border-primary/40 shadow-sm" : "hover:border-border/80"
              )}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left"
              >
                <span className="font-semibold text-foreground pr-4">{faq.q}</span>
                <ChevronDown
                  className={cn(
                    "w-5 h-5 text-primary flex-shrink-0 transition-transform duration-200",
                    open === i && "rotate-180"
                  )}
                />
              </button>
              {open === i && (
                <div className="px-6 pb-5">
                  <p className="text-muted-foreground leading-relaxed text-sm">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Still have questions */}
        <div className="mt-10 text-center bg-muted/40 rounded-2xl p-6">
          <p className="text-sm text-foreground font-medium mb-1">¿Tienes otra duda?</p>
          <p className="text-sm text-muted-foreground mb-4">
            Escríbenos por WhatsApp y te respondemos en menos de 1 hora.
          </p>
          <a
            href="https://wa.me/573194565463?text=Hola!+Tengo+una+pregunta+sobre+los+aromas"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#1da851] transition-colors"
          >
            Chatear por WhatsApp
          </a>
        </div>
      </div>
    </section>
  )
}
