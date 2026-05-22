import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description: "Política de tratamiento de datos personales de Bienestar by Cliché, conforme a la Ley 1581 de 2012.",
}

export default function PoliticaPrivacidad() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-28 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <nav className="text-sm text-muted-foreground mb-8 flex items-center gap-2">
            <Link href="/" className="hover:text-primary transition-colors">Inicio</Link>
            <span>›</span>
            <span>Política de Privacidad</span>
          </nav>

          <h1 className="text-4xl font-serif font-bold text-foreground mb-2">
            Política de Privacidad
          </h1>
          <p className="text-muted-foreground mb-10">
            Última actualización: mayo 2025 · Conforme a la Ley 1581 de 2012 (Colombia)
          </p>

          <div className="prose prose-sm max-w-none space-y-8 text-muted-foreground">

            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">1. Responsable del Tratamiento</h2>
              <p>
                <strong>Bienestar by Cliché</strong>, empresa colombiana dedicada a la venta de productos aromáticos artesanales, con contacto a través de{" "}
                <a href="https://wa.me/573194565463" className="text-primary hover:underline">WhatsApp +57 319 456 5463</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">2. Datos que Recopilamos</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Nombre completo y correo electrónico (al suscribirse o realizar una compra)</li>
                <li>Dirección de envío (al realizar una compra)</li>
                <li>Información del dispositivo y navegación (cookies analíticas)</li>
                <li>Historial de pedidos y preferencias de productos</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">3. Finalidades del Tratamiento</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Gestionar y procesar sus pedidos de compra</li>
                <li>Enviarle comunicaciones sobre su pedido y número de seguimiento</li>
                <li>Enviarle comunicaciones comerciales y promocionales (solo si usted las solicitó)</li>
                <li>Mejorar nuestros productos y servicios mediante análisis estadísticos</li>
                <li>Cumplir con obligaciones legales y contables</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">4. Base Legal del Tratamiento</h2>
              <p>
                El tratamiento de sus datos se basa en: (i) la ejecución del contrato de compraventa, (ii) su consentimiento expresado al suscribirse a comunicaciones, y (iii) el cumplimiento de obligaciones legales según la Ley 1581 de 2012 y el Decreto 1377 de 2013.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">5. Compartición de Datos</h2>
              <p>Sus datos no serán vendidos ni cedidos a terceros. Únicamente se compartirán con:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li><strong>Operadores de pago</strong> (procesadores de pagos) para la transacción</li>
                <li><strong>Empresas de logística y mensajería</strong> para la entrega de sus pedidos</li>
                <li><strong>Proveedores de servicios tecnológicos</strong> (Supabase, Vercel) bajo acuerdos de confidencialidad</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">6. Sus Derechos (Ley 1581/2012)</h2>
              <p>Usted tiene derecho a:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li><strong>Conocer, actualizar y rectificar</strong> sus datos personales</li>
                <li><strong>Solicitar la supresión</strong> de sus datos cuando no sean necesarios para las finalidades</li>
                <li><strong>Revocar su consentimiento</strong> para comunicaciones comerciales en cualquier momento</li>
                <li><strong>Acceder gratuitamente</strong> a sus datos tratados</li>
              </ul>
              <p className="mt-3">
                Para ejercer estos derechos, contáctenos en:{" "}
                <a href="https://wa.me/573194565463" className="text-primary hover:underline">WhatsApp +57 319 456 5463</a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">7. Cookies</h2>
              <p>
                Utilizamos cookies técnicas (necesarias para el funcionamiento del sitio), analíticas (Google Analytics 4, Meta Pixel, TikTok Pixel) y de preferencias. Puede gestionar las cookies desde la configuración de su navegador. El uso de cookies analíticas requiere su consentimiento.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">8. Retención de Datos</h2>
              <p>
                Conservamos sus datos mientras sea necesario para las finalidades descritas o mientras exista una relación comercial. Los datos de suscripciones se eliminan al solicitar la baja. Los datos de pedidos se retienen por 5 años por obligaciones contables.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">9. Seguridad</h2>
              <p>
                Implementamos medidas técnicas y organizativas adecuadas para proteger sus datos contra acceso no autorizado, pérdida o alteración, incluyendo cifrado en tránsito (HTTPS) y almacenamiento seguro en servidores certificados.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">10. Cambios en esta Política</h2>
              <p>
                Nos reservamos el derecho de actualizar esta política. Le notificaremos cambios significativos por correo electrónico. La fecha de última actualización siempre estará visible al inicio del documento.
              </p>
            </section>

            <div className="bg-muted/40 rounded-2xl p-5 mt-8">
              <p className="text-sm text-foreground font-semibold">¿Preguntas sobre tu privacidad?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Escríbenos a nuestro{" "}
                <a href="https://wa.me/573194565463" className="text-primary hover:underline">WhatsApp</a>{" "}
                y responderemos en máximo 48 horas hábiles.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
