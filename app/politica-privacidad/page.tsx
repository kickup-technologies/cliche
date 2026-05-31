import type { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Política de Privacidad | Cliché Aromas",
  description:
    "Conoce cómo Cliché Aromas recolecta, usa y protege tus datos personales conforme a la Ley 1581 de 2012 de Colombia.",
}

export default function PoliticaPrivacidadPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-foreground mb-2">
          Política de Privacidad
        </h1>
        <p className="text-sm text-foreground/50 mb-10">
          Última actualización: 31 de mayo de 2026
        </p>

        <div className="prose prose-neutral max-w-none space-y-6 text-foreground/80 leading-relaxed">
          <section>
            <h2 className="font-serif text-xl font-semibold text-foreground">1. Responsable del tratamiento</h2>
            <p>
              Cliché Aromas (&quot;Cliché&quot;, &quot;nosotros&quot;) es responsable del tratamiento de los datos
              personales que recolectamos a través de este sitio web. Para cualquier consulta sobre tus datos puedes
              escribirnos por WhatsApp al{" "}
              <a className="text-primary hover:underline" href="https://wa.me/573194565463">
                +57 319 4565463
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-foreground">2. Datos que recolectamos</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Datos de contacto: nombre, correo electrónico, teléfono y dirección de envío.</li>
              <li>Datos de tus pedidos: productos comprados, monto y estado del pedido.</li>
              <li>Datos de navegación: páginas visitadas y eventos de interacción, con fines analíticos.</li>
            </ul>
            <p>
              Los pagos se procesan a través de la pasarela Wompi. Cliché <strong>no almacena</strong> los datos de tu
              tarjeta de crédito o débito.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-foreground">3. Finalidad del tratamiento</h2>
            <p>
              Usamos tus datos para procesar y entregar tus pedidos, brindarte soporte, enviarte información sobre el
              estado de tu compra y, si lo autorizas, comunicaciones promocionales. Puedes cancelar la suscripción a
              nuestros correos en cualquier momento.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-foreground">4. Tus derechos</h2>
            <p>
              Conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013 de Colombia, tienes derecho a conocer,
              actualizar, rectificar y solicitar la supresión de tus datos personales, así como a revocar la
              autorización otorgada. Para ejercerlos, contáctanos por WhatsApp.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-foreground">5. Seguridad</h2>
            <p>
              Implementamos medidas técnicas y organizativas razonables para proteger tus datos contra acceso no
              autorizado, pérdida o alteración. La información se almacena en servidores con cifrado en tránsito.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-foreground">6. Cambios a esta política</h2>
            <p>
              Podemos actualizar esta política periódicamente. La versión vigente siempre estará publicada en esta
              página con su fecha de actualización.
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
