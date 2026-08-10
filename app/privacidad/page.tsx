import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Metadata } from "next"

export const metadata: Metadata = {
  alternates: { canonical: "/privacidad" },
  title: "Política de Privacidad | Cliché Aromas",
  description: "Política de tratamiento de datos personales de Cliché Aromas, conforme a la Ley 1581 de 2012 de Colombia.",
}

export default function PrivacidadPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-28 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Cliché Aromas</p>
            <h1 className="text-4xl font-serif font-bold text-foreground mb-3">Política de Privacidad</h1>
            <p className="text-muted-foreground text-sm">Última actualización: mayo 2025 · Conforme a la Ley 1581 de 2012 (Colombia)</p>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 mb-10">
            <p className="text-sm text-foreground leading-relaxed">
              <strong>Cliché Aromas</strong> se compromete con la protección de sus datos personales. Esta política explica qué datos recopilamos, cómo los usamos y cuáles son sus derechos como titular, de conformidad con la <strong>Ley Estatutaria 1581 de 2012</strong>, el Decreto Reglamentario 1377 de 2013 y demás normas concordantes.
            </p>
          </div>

          <div className="prose prose-sm max-w-none space-y-10 text-foreground">

            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">1. Responsable del tratamiento</h2>
              <p className="text-muted-foreground leading-relaxed">
                El responsable del tratamiento de datos personales es <strong>Cliché Aromas</strong>, marca colombiana operada desde Colombia.
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-3">
                <li>Correo de contacto para datos: <strong>monica@clichecolombia.com</strong></li>
                <li>Sitio web: <strong>clichecolombia.com</strong></li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">2. Datos que recopilamos</h2>
              <p className="text-muted-foreground leading-relaxed">Recopilamos únicamente los datos necesarios para prestar nuestro servicio:</p>
              <div className="space-y-3 mt-3">
                {[
                  { cat: "Datos de identificación", desc: "Nombre completo, dirección de entrega, ciudad, departamento." },
                  { cat: "Datos de contacto", desc: "Correo electrónico, número de teléfono / WhatsApp." },
                  { cat: "Datos de transacción", desc: "Historial de pedidos, productos comprados, montos. Los datos de tarjeta son procesados directamente por la pasarela de pago — Cliché Aromas nunca almacena datos financieros sensibles." },
                  { cat: "Datos de navegación", desc: "Dirección IP, tipo de dispositivo, páginas visitadas, tiempo de sesión (mediante cookies y herramientas analíticas)." },
                  { cat: "Datos voluntarios", desc: "Reseñas, fotos o videos adjuntos a reseñas, comentarios enviados mediante formularios." },
                ].map(({ cat, desc }) => (
                  <div key={cat} className="flex gap-3 p-3 bg-muted/30 rounded-xl">
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{cat}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">3. Finalidades del tratamiento</h2>
              <p className="text-muted-foreground leading-relaxed">Sus datos personales son utilizados exclusivamente para:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-3">
                <li>Procesar y gestionar pedidos, pagos y envíos.</li>
                <li>Enviar confirmaciones de pedido, número de guía y novedades de entrega.</li>
                <li>Comunicaciones de servicio al cliente y resolución de peticiones, quejas y reclamos (PQR).</li>
                <li>Envío de comunicaciones comerciales y/o descuentos cuando el usuario se ha suscrito voluntariamente a nuestro boletín.</li>
                <li>Mejorar la experiencia del usuario en el Sitio mediante análisis de navegación agregados y anónimos.</li>
                <li>Cumplir con obligaciones legales, contables y fiscales.</li>
                <li>Prevenir fraudes y proteger la seguridad de la plataforma.</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                <strong>No vendemos, alquilamos ni cedemos</strong> sus datos personales a terceros para fines comerciales propios de esos terceros.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">4. Base legal del tratamiento</h2>
              <p className="text-muted-foreground leading-relaxed">
                El tratamiento de sus datos se realiza bajo las siguientes bases legales, según el artículo 6 de la Ley 1581 de 2012:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-3">
                <li><strong>Ejecución del contrato:</strong> para procesar compras y entregas.</li>
                <li><strong>Consentimiento:</strong> para envío de comunicaciones de marketing (otorgado al suscribirse al boletín).</li>
                <li><strong>Obligación legal:</strong> para cumplir con requerimientos fiscales, tributarios y de las autoridades colombianas.</li>
                <li><strong>Interés legítimo:</strong> para prevención de fraude y seguridad de la plataforma.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">5. Cookies y tecnologías de seguimiento</h2>
              <p className="text-muted-foreground leading-relaxed">
                El Sitio utiliza cookies propias y de terceros para funcionalidad técnica, análisis de audiencia y publicidad. Puede gestionar sus preferencias de cookies a través de la configuración de su navegador. Algunas funcionalidades del Sitio pueden no estar disponibles si deshabilita todas las cookies.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-3">
                Utilizamos herramientas como <strong>Meta Pixel</strong> para medir el rendimiento de campañas publicitarias. Esta herramienta puede recopilar datos de navegación según las políticas de Meta Platforms, Inc.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">6. Transferencias de datos</h2>
              <p className="text-muted-foreground leading-relaxed">
                Para prestar nuestros servicios, compartimos datos con proveedores de confianza bajo contratos de confidencialidad:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-3">
                <li><strong>Operadores logísticos:</strong> nombre y dirección de entrega para despachar el pedido.</li>
                <li><strong>Pasarela de pago:</strong> datos de transacción para procesar el cobro de forma segura.</li>
                <li><strong>Proveedor de hosting/base de datos:</strong> almacenamiento seguro de información (Supabase, con servidores en EE.UU. bajo cláusulas contractuales estándar de protección de datos).</li>
                <li><strong>Plataformas de email:</strong> correo electrónico para notificaciones transaccionales.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">7. Sus derechos como titular</h2>
              <p className="text-muted-foreground leading-relaxed">
                De conformidad con la Ley 1581 de 2012, usted tiene derecho a:
              </p>
              <div className="grid sm:grid-cols-2 gap-3 mt-3">
                {[
                  { right: "Conocer", desc: "Conocer los datos que tenemos sobre usted." },
                  { right: "Actualizar", desc: "Corregir datos inexactos o incompletos." },
                  { right: "Rectificar", desc: "Solicitar la corrección de información errónea." },
                  { right: "Suprimir", desc: "Solicitar la eliminación de sus datos cuando no exista obligación legal de conservarlos." },
                  { right: "Revocar", desc: "Retirar el consentimiento para el tratamiento con fines comerciales en cualquier momento." },
                  { right: "Acceder", desc: "Acceder gratuitamente a sus datos personales tratados por Cliché Aromas." },
                ].map(({ right, desc }) => (
                  <div key={right} className="p-3 bg-muted/30 rounded-xl">
                    <p className="text-sm font-semibold text-foreground">{right}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Para ejercer cualquiera de estos derechos, envíe una solicitud a <strong>monica@clichecolombia.com</strong> con asunto "Derechos ARCO — Datos Personales" e incluya su nombre completo y correo electrónico registrado. Atenderemos su solicitud en un plazo máximo de <strong>15 días hábiles</strong>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">8. Seguridad de los datos</h2>
              <p className="text-muted-foreground leading-relaxed">
                Implementamos medidas técnicas y organizativas para proteger sus datos personales contra acceso no autorizado, pérdida, alteración o divulgación. Estas incluyen cifrado en tránsito (HTTPS/TLS), acceso restringido a datos sensibles y bases de datos protegidas con políticas de seguridad a nivel de fila (RLS).
              </p>
              <p className="text-muted-foreground leading-relaxed mt-3">
                En caso de violación de seguridad que afecte sus datos, Cliché Aromas notificará a los afectados y a la Superintendencia de Industria y Comercio (SIC) en los términos que establece la ley.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">9. Conservación de datos</h2>
              <p className="text-muted-foreground leading-relaxed">
                Conservamos sus datos personales durante el tiempo necesario para cumplir con las finalidades descritas y las obligaciones legales aplicables. Los datos de transacciones se conservan por el período exigido por la normativa fiscal colombiana (mínimo 5 años). Los datos de marketing se eliminan una vez revocado el consentimiento.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">10. Menores de edad</h2>
              <p className="text-muted-foreground leading-relaxed">
                El Sitio no está dirigido a menores de 18 años. No recopilamos conscientemente datos personales de menores. Si como padre, madre o tutor detecta que un menor nos ha proporcionado información, escríbanos a <strong>monica@clichecolombia.com</strong> para proceder a la eliminación inmediata de dichos datos.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">11. Autoridad de supervisión</h2>
              <p className="text-muted-foreground leading-relaxed">
                Si considera que el tratamiento de sus datos no cumple con la normativa vigente, puede presentar una queja ante la <strong>Superintendencia de Industria y Comercio (SIC)</strong>, entidad encargada de la protección de datos personales en Colombia.
              </p>
              <p className="text-muted-foreground mt-2 text-sm">Sitio web SIC: <strong>www.sic.gov.co</strong></p>
            </section>

            <section>
              <h2 className="text-xl font-serif font-bold text-foreground mb-3">12. Cambios a esta política</h2>
              <p className="text-muted-foreground leading-relaxed">
                Cliché Aromas puede actualizar esta Política de Privacidad periódicamente. Cualquier cambio significativo será comunicado mediante aviso en el Sitio o por correo electrónico a los usuarios registrados. La fecha de última actualización siempre será visible al inicio de este documento.
              </p>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
