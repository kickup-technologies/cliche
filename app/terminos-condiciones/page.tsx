import type { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Términos y Condiciones | Cliché Aromas",
  description:
    "Términos y condiciones de uso, compra, envíos y devoluciones de la tienda Cliché Aromas.",
}

export default function TerminosCondicionesPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-foreground mb-2">
          Términos y Condiciones
        </h1>
        <p className="text-sm text-foreground/50 mb-10">Última actualización: 31 de mayo de 2026</p>

        <div className="prose prose-neutral max-w-none space-y-6 text-foreground/80 leading-relaxed">
          <section>
            <h2 className="font-serif text-xl font-semibold text-foreground">1. Aceptación</h2>
            <p>
              Al navegar y realizar compras en este sitio aceptas los presentes términos y condiciones. Si no estás de
              acuerdo, por favor abstente de usar el sitio.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-foreground">2. Productos y precios</h2>
            <p>
              Todos los precios están expresados en pesos colombianos (COP) e incluyen los impuestos aplicables. Nos
              reservamos el derecho de modificar precios y disponibilidad sin previo aviso. Las imágenes son
              ilustrativas.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-foreground">3. Pagos</h2>
            <p>
              Los pagos se procesan de forma segura a través de la pasarela Wompi. Tu pedido se confirma únicamente una
              vez que el pago es aprobado.
            </p>
          </section>

          <section id="envios" className="scroll-mt-24">
            <h2 className="font-serif text-xl font-semibold text-foreground">4. Envíos y devoluciones</h2>
            <p>
              Realizamos envíos a todo Colombia. Los tiempos de entrega estimados son de 2 a 5 días hábiles según la
              ciudad de destino. Una vez despachado tu pedido recibirás un número de seguimiento.
            </p>
            <p>
              Si tu producto llega defectuoso o dañado, contáctanos dentro de los 5 días hábiles siguientes a la
              entrega por WhatsApp al{" "}
              <a className="text-primary hover:underline" href="https://wa.me/573194565463">
                +57 319 4565463
              </a>{" "}
              para gestionar el cambio o reembolso, conforme al derecho de retracto previsto en la Ley 1480 de 2011
              (Estatuto del Consumidor).
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-foreground">5. Propiedad intelectual</h2>
            <p>
              Todo el contenido del sitio (marca, textos, imágenes y diseño) es propiedad de Cliché Aromas y está
              protegido por las leyes de propiedad intelectual. Queda prohibida su reproducción sin autorización.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-foreground">6. Contacto</h2>
            <p>
              Para cualquier inquietud sobre estos términos, escríbenos por WhatsApp. Estaremos encantados de ayudarte.
            </p>
          </section>
        </div>

        <div className="mt-12">
          <Link href="/" className="text-sm text-primary hover:underline">
            ← Volver al inicio
          </Link>
        </div>
      </main>
      <Footer />
    </>
  )
}
