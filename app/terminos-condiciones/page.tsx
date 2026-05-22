import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Términos y Condiciones",
  description: "Términos y condiciones de compra de Bienestar by Cliché.",
}

export default function TerminosCondiciones() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-28 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <nav className="text-sm text-muted-foreground mb-8 flex items-center gap-2">
            <Link href="/" className="hover:text-primary transition-colors">Inicio</Link>
            <span>›</span>
            <span>Términos y Condiciones</span>
          </nav>

          <h1 className="text-4xl font-serif font-bold text-foreground mb-2">
            Términos y Condiciones
          </h1>
          <p className="text-muted-foreground mb-10">
            Última actualización: mayo 2025
          </p>

          <div className="prose prose-sm max-w-none space-y-8 text-muted-foreground">

            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">1. Aceptación</h2>
              <p>
                Al acceder y realizar una compra en <strong>Bienestar by Cliché</strong>, usted acepta los presentes Términos y Condiciones en su totalidad. Si no está de acuerdo con alguno de estos términos, le rogamos no utilizar nuestros servicios.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">2. Productos y Precios</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Todos los precios están expresados en pesos colombianos (COP) e incluyen IVA.</li>
                <li>Nos reservamos el derecho de modificar precios sin previo aviso, respetando siempre el precio vigente en el momento de confirmar el pedido.</li>
                <li>Las imágenes de los productos son ilustrativas. El color exacto puede variar ligeramente según el monitor.</li>
                <li>La disponibilidad del stock puede cambiar sin previo aviso.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">3. Proceso de Compra</h2>
              <p>El proceso de compra consta de los siguientes pasos:</p>
              <ol className="list-decimal pl-5 space-y-1 mt-2">
                <li>Selección de productos y adición al carrito</li>
                <li>Revisión del carrito y aplicación de códigos de descuento</li>
                <li>Ingreso de datos de envío y pago</li>
                <li>Confirmación del pedido y pago</li>
                <li>Recepción de confirmación por correo electrónico</li>
              </ol>
              <p className="mt-3">
                El contrato de compraventa se perfecciona cuando recibe la confirmación del pedido por correo electrónico.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">4. Pagos</h2>
              <p>
                Los pagos se procesan de forma segura a través de pasarelas de pago certificadas. Aceptamos tarjetas de crédito, débito y otros métodos locales. <strong>Bienestar by Cliché</strong> no almacena datos de tarjetas bancarias.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">5. Envíos</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Envío estándar:</strong> 3–5 días hábiles a todo Colombia.</li>
                <li><strong>Envío gratis</strong> en compras mayores a $150.000 COP.</li>
                <li>Los tiempos de entrega son estimados y pueden variar por condiciones externas.</li>
                <li>Una vez despachado el pedido, recibirá un número de seguimiento por correo.</li>
                <li>No realizamos envíos internacionales en este momento.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">6. Devoluciones y Garantía</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Aceptamos devoluciones dentro de los <strong>30 días calendario</strong> siguientes a la recepción del producto.</li>
                <li>El producto debe estar en su empaque original, sin usar y sin daños.</li>
                <li>En caso de producto defectuoso o incorrecto, cubrimos el costo del envío de devolución.</li>
                <li>Los reembolsos se realizan en máximo 10 días hábiles al mismo medio de pago original.</li>
                <li>Los productos de higiene personal no admiten devolución una vez abiertos.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">7. Códigos de Descuento</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Los códigos de descuento son de uso personal e intransferible.</li>
                <li>No se pueden combinar múltiples códigos en un mismo pedido.</li>
                <li>Los códigos tienen fecha de vencimiento y no se pueden usar después de expirar.</li>
                <li>El descuento se aplica sobre el precio regular, no sobre productos ya en oferta.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">8. Propiedad Intelectual</h2>
              <p>
                Todos los contenidos del sitio (textos, imágenes, marca, diseño) son propiedad de <strong>Bienestar by Cliché</strong> y están protegidos por las leyes de propiedad intelectual colombianas. Queda prohibida su reproducción sin autorización expresa.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">9. Limitación de Responsabilidad</h2>
              <p>
                <strong>Bienestar by Cliché</strong> no será responsable por daños indirectos derivados del uso de nuestros productos más allá del valor pagado por el pedido. Nuestros productos están diseñados para uso decorativo y de bienestar, no son medicamentos.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">10. Ley Aplicable</h2>
              <p>
                Estos términos se rigen por las leyes de la República de Colombia. Cualquier controversia se resolverá en los tribunales competentes de la ciudad de Bogotá, D.C., salvo acuerdo mutuo de las partes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">11. Contacto</h2>
              <p>
                Para cualquier consulta sobre estos Términos, contáctenos:{" "}
                <a href="https://wa.me/573194565463" className="text-primary hover:underline">WhatsApp +57 319 456 5463</a>
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
