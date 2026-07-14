import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Términos y Condiciones | Cliché Aromas",
  description: "Términos y condiciones de uso, política de compras, envíos y devoluciones de Cliché Aromas Colombia.",
}

export default function TerminosPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-28 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Cliché Aromas</p>
            <h1 className="text-4xl font-serif font-bold text-foreground mb-3">Términos y Condiciones</h1>
            <p className="text-muted-foreground text-sm">Última actualización: mayo 2025 · Aplica para Colombia</p>
          </div>

          <div className="prose prose-sm max-w-none space-y-10 text-foreground">

            {/* 1 */}
            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">1. Aceptación de los términos</h2>
              <p className="text-muted-foreground leading-relaxed">
                Al ingresar, navegar o realizar una compra en <strong>clichecolombia.com</strong> (en adelante "el Sitio"), el usuario declara haber leído, entendido y aceptado la totalidad de estos Términos y Condiciones, así como la Política de Privacidad. Si no está de acuerdo con alguna cláusula, debe abstenerse de usar el Sitio.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Cliché Aromas se reserva el derecho de modificar estos términos en cualquier momento. Los cambios entrarán en vigencia al momento de su publicación en el Sitio. Es responsabilidad del usuario revisarlos periódicamente.
              </p>
            </section>

            {/* 2 */}
            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">2. Información del vendedor</h2>
              <p className="text-muted-foreground leading-relaxed">
                <strong>Cliché Aromas</strong> es una marca colombiana dedicada a la fabricación y comercialización de aromatizantes textiles y ambientadores de alta concentración. Operamos desde Colombia y atendemos a todo el territorio nacional.
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-3">
                <li>Correo electrónico: <strong>monica@clichecolombia.com</strong></li>
                <li>WhatsApp: disponible en el Sitio</li>
                <li>País de operación: Colombia</li>
              </ul>
            </section>

            {/* 3 */}
            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">3. Productos y disponibilidad</h2>
              <p className="text-muted-foreground leading-relaxed">
                Los precios de los productos se expresan en Pesos Colombianos (COP) e incluyen IVA cuando aplique. Cliché Aromas se reserva el derecho de modificar precios, características o disponibilidad de los productos sin previo aviso.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Las imágenes y descripciones de los productos son ilustrativas y pueden variar levemente frente al producto físico. La disponibilidad de stock no está garantizada hasta confirmada la orden.
              </p>
            </section>

            {/* 4 */}
            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">4. Proceso de compra y pagos</h2>
              <p className="text-muted-foreground leading-relaxed">
                El proceso de compra se realiza íntegramente a través de nuestra pasarela de pago segura. Al confirmar su compra, el usuario acepta haber verificado los productos en su carrito, la dirección de entrega y el método de pago seleccionado.
              </p>
              <div className="bg-muted/40 rounded-xl p-4 mt-4 space-y-2">
                <p className="text-sm font-semibold text-foreground">Métodos de pago aceptados:</p>
                <ul className="list-disc list-inside text-muted-foreground text-sm space-y-1">
                  <li>Tarjetas de crédito y débito Visa, Mastercard, American Express</li>
                  <li>PSE (débito bancario)</li>
                  <li>Billeteras digitales (según disponibilidad)</li>
                </ul>
              </div>
              <p className="text-muted-foreground leading-relaxed mt-3">
                En caso de error en el cobro imputable a Cliché Aromas, realizaremos el reintegro correspondiente dentro de los 5 días hábiles siguientes a la verificación del caso.
              </p>
            </section>

            {/* 5 — el ancla id="envios" existe porque el footer enlaza /terminos#envios */}
            <section id="envios" className="scroll-mt-28">
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">5. Envíos y tiempos de entrega</h2>
              <div className="space-y-3 text-muted-foreground leading-relaxed">
                <p>Los envíos se realizan a todo el territorio nacional colombiano mediante operadores logísticos autorizados.</p>
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Ciudades principales:</strong> 2–4 días hábiles</li>
                  <li><strong>Municipios y zonas apartadas:</strong> 4–8 días hábiles</li>
                  <li><strong>Envío gratis</strong> en compras mayores a $300.000 COP</li>
                </ul>
                <p>Los tiempos de entrega son estimados y pueden variar por causas externas (festivos, condiciones climáticas, fuerza mayor). Cliché Aromas no se hace responsable por demoras atribuibles al operador logístico, una vez el paquete haya sido despachado.</p>
                <p>El usuario recibirá un número de guía para rastrear su pedido. Es responsabilidad del usuario verificar la dirección de entrega antes de finalizar la compra. No realizamos devoluciones de costos de envío por dirección incorrecta proporcionada por el comprador.</p>
              </div>
            </section>

            {/* 6 — Derecho de retracto: obligatorio en ventas a distancia (art. 47
                Ley 1480); es lo primero que revisa la SIC ante una queja. */}
            <section id="retracto" className="scroll-mt-28">
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">6. Derecho de retracto (art. 47, Ley 1480 de 2011)</h2>
              <p className="text-muted-foreground leading-relaxed">
                Por tratarse de una venta a distancia (comercio electrónico), el consumidor cuenta con el derecho de retracto: puede desistir de la compra dentro de los <strong>cinco (5) días hábiles</strong> siguientes a la entrega del producto, sin necesidad de justificar su decisión.
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-3">
                <li>Al ejercer el retracto se resuelve el contrato y Cliché Aromas devolverá <strong>la totalidad del dinero pagado</strong>, en un plazo máximo de treinta (30) días calendario desde que el consumidor comunicó su decisión.</li>
                <li>El producto debe devolverse en las mismas condiciones en que fue recibido: <strong>sin uso</strong>, con su empaque y sellos originales.</li>
                <li>Los <strong>costos de transporte de la devolución</strong> del producto corren por cuenta del consumidor, conforme al artículo 47 de la Ley 1480.</li>
                <li>Para ejercerlo, escribe a <strong>monica@clichecolombia.com</strong> o al WhatsApp del Sitio indicando tu número de pedido dentro del plazo señalado.</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Este derecho es irrenunciable y opera con independencia de la garantía voluntaria descrita en la sección 8.
              </p>
            </section>

            {/* 7 — Reversión del pago (art. 51 Ley 1480): aplica a compras con
                tarjeta u otros instrumentos de pago electrónico. */}
            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">7. Reversión del pago (art. 51, Ley 1480 de 2011)</h2>
              <p className="text-muted-foreground leading-relaxed">
                Cuando la compra se realice con tarjeta de crédito, débito o cualquier otro instrumento de pago electrónico, el consumidor podrá solicitar la <strong>reversión del pago</strong> ante el emisor de su medio de pago en los siguientes casos:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-3">
                <li>Cuando sea objeto de fraude.</li>
                <li>Cuando la operación corresponda a una transacción no solicitada.</li>
                <li>Cuando el producto adquirido no sea recibido.</li>
                <li>Cuando el producto entregado no corresponda a lo solicitado o sea defectuoso.</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Para ello, el consumidor deberá presentar queja ante Cliché Aromas y notificar al emisor del instrumento de pago dentro de los cinco (5) días hábiles siguientes a la fecha en que tuvo noticia de la operación o en que debió recibir el producto, devolviendo el producto cuando corresponda, conforme al artículo 51 de la Ley 1480 y sus normas reglamentarias.
              </p>
            </section>

            {/* 8 */}
            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">8. Política de devoluciones y garantía</h2>
              <p className="text-muted-foreground leading-relaxed">
                Cliché Aromas ofrece una garantía de <strong>30 días calendario</strong> desde la fecha de recepción del producto. Para hacer efectiva la garantía:
              </p>
              <ol className="list-decimal list-inside text-muted-foreground space-y-2 mt-3">
                <li>El producto no debe haber sido usado en más del 20% de su contenido.</li>
                <li>Debe presentarse prueba de compra (número de pedido o confirmación por correo).</li>
                <li>El empaque original debe estar en buen estado.</li>
                <li>La solicitud debe realizarse a <strong>monica@clichecolombia.com</strong> dentro del plazo establecido.</li>
              </ol>
              <p className="text-muted-foreground leading-relaxed mt-3">
                No aplicarán devoluciones por: preferencia de olor (los aromas están claramente descritos en el Sitio), productos dañados por uso inadecuado, o compras realizadas fuera de nuestros canales oficiales.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-3">
                En casos de producto defectuoso o envío incorrecto imputable a Cliché Aromas, asumimos el costo del envío de devolución y reenvío del producto correcto o reintegro total.
              </p>
            </section>

            {/* 7 */}
            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">7. Conducta del comprador y uso prohibido</h2>
              <p className="text-muted-foreground leading-relaxed">
                El usuario se compromete a:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-3">
                <li>Proporcionar información verídica al momento de la compra (nombre, dirección, datos de contacto).</li>
                <li>No realizar compras fraudulentas, contracargos injustificados o solicitudes de devolución de mala fe.</li>
                <li>No realizar pedidos con intención de retener el producto y reclamar el reembolso simultáneamente.</li>
                <li>No revender los productos bajo la marca Cliché Aromas sin autorización expresa y escrita.</li>
              </ul>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-4">
                <p className="text-sm font-semibold text-red-700 mb-1">Protección ante fraude</p>
                <p className="text-sm text-red-600">
                  Cliché Aromas se reserva el derecho de cancelar pedidos, bloquear usuarios y/o emprender acciones legales ante conductas fraudulentas, contracargos injustificados o intentos de estafa. Toda transacción queda registrada y puede ser usada como evidencia ante autoridades competentes.
                </p>
              </div>
            </section>

            {/* 8 */}
            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">8. Reseñas y contenido generado por usuarios</h2>
              <p className="text-muted-foreground leading-relaxed">
                Al publicar una reseña en el Sitio, el usuario otorga a Cliché Aromas una licencia no exclusiva para usar, reproducir y mostrar dicho contenido en sus canales de comunicación. Las reseñas deben ser verídicas, basadas en experiencia propia y respetuosas. Cliché Aromas se reserva el derecho de no publicar o eliminar contenido ofensivo, falso o que infrinja derechos de terceros.
              </p>
            </section>

            {/* 9 */}
            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">9. Propiedad intelectual</h2>
              <p className="text-muted-foreground leading-relaxed">
                Todos los contenidos del Sitio — incluyendo textos, imágenes, logotipos, diseños, nombres y aromas — son propiedad de Cliché Aromas o han sido licenciados legalmente. Queda prohibida su reproducción, distribución o uso comercial sin autorización escrita previa.
              </p>
            </section>

            {/* 10 */}
            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">10. Limitación de responsabilidad</h2>
              <p className="text-muted-foreground leading-relaxed">
                Cliché Aromas no será responsable por: daños indirectos, pérdida de datos, interrupciones del servicio por causas externas, o reacciones alérgicas en personas con sensibilidades conocidas que no hayan verificado los ingredientes antes del uso. La responsabilidad máxima de Cliché Aromas ante cualquier reclamación estará limitada al valor del pedido implicado.
              </p>
            </section>

            {/* 11 */}
            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">11. Ley aplicable y jurisdicción</h2>
              <p className="text-muted-foreground leading-relaxed">
                Estos términos se rigen por las leyes de la República de Colombia, en especial la Ley 1480 de 2011 (Estatuto del Consumidor), el Código de Comercio y las demás normas aplicables. Cualquier controversia será resuelta ante los jueces competentes de Colombia, renunciando el usuario a cualquier otro fuero que pudiera corresponderle.
              </p>
            </section>

            {/* 12 */}
            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">12. Contacto</h2>
              <p className="text-muted-foreground leading-relaxed">
                Para cualquier consulta relacionada con estos términos, puedes escribirnos a <strong>monica@clichecolombia.com</strong> o a través del WhatsApp disponible en el Sitio. Atendemos de lunes a sábado de 8:00 a.m. a 6:00 p.m. (hora Colombia).
              </p>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
