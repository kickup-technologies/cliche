/**
 * Contexto del panel admin para el ayudante con IA (burbuja de chat).
 *
 * Es el "manual" que el asistente lee antes de responder, para que sepa dónde
 * está cada cosa y cómo se usa. Vive aparte del endpoint a propósito: cuando
 * se agregue o cambie una sección del panel, se actualiza AQUÍ y el ayudante
 * queda al día sin tocar nada más.
 *
 * Reglas al editar: hablar como le hablarías a la dueña (sin jerga), describir
 * lo que se VE en pantalla (botones, nombres de campos) y no prometer
 * funciones que no existan.
 */

export const PANEL_CONTEXT = `
=== CÓMO SE ENTRA AL PANEL ===
Se entra por una dirección secreta del sitio y con doble seguridad: primero la sesión de la cuenta de la dueña y luego un código de 6 dígitos que llega a su correo. El código vence en 10 minutos y la sesión dura 8 horas; después vuelve a pedirlo. El menú está a la izquierda (en celular se abre con el botón de rayitas arriba a la izquierda). Abajo del menú están "Actualizar datos", "Ver tienda" y "Cerrar sesión".

=== RESUMEN ===
La foto del negocio: ingresos y pedidos del periodo, estado de los pedidos, productos más vendidos, ciudades con más envíos, descuentos otorgados y dos avisos importantes: "Por despachar" (pedidos pagados que todavía no se envían, contando todo el histórico) y "Stock bajo" (productos con 5 o menos unidades). Casi todas las secciones tienen un selector de periodo arriba; si un número se ve raro, lo primero es revisar qué periodo está elegido.

=== VENTAS ===
Ingresos y pedidos día por día, "Mejores productos" por ingresos del periodo y "Productos con bajo rendimiento" (los que casi no se venden y conviene mover, mejorar la foto o incluir en un combo).

=== TRÁFICO ===
Cuánta gente entra, qué páginas ven y el embudo de conversión: cuántos visitan, cuántos agregan al carrito y cuántos compran. Si entran muchos y compran pocos, el problema suele estar en precio, fotos o costo de envío, no en la publicidad.

=== PRODUCTOS (analíticas) ===
Rendimiento por producto: producto estrella, matriz de rendimiento, velocidad de venta, "productos dormidos" (activos pero sin ninguna venta en el periodo) y "stock crítico".

=== MAPAS DE CALOR ===
Muestra dónde hace clic la gente y hasta dónde baja en la página. Rojo = zona caliente (muy vista o muy clicada), azul = fría. Sirve para decidir qué subir más arriba en la página. Los datos propios (clics y visitas) salen solos; los mapas avanzados vienen de Microsoft Clarity y requieren que Andrés configure un token — el propio panel explica el paso a paso en esa sección.

=== PEDIDOS ===
Cada pedido muestra cliente (nombre, correo, teléfono, cédula/NIT), dirección de envío, productos y total. Al abrir un pedido se puede cambiar el estado, y escribir la TRANSPORTADORA y el NÚMERO DE GUÍA.
Estados: pendiente → pagado/confirmado → preparando → despachado → entregado; también cancelado.
IMPORTANTE al despachar: elegir la transportadora (Servientrega, Interrapidísimo, FedEx o UPS), escribir el número de guía y poner el estado en "Despachado". Con eso el cliente recibe automáticamente el correo de "pedido enviado" con su guía para rastrear. Si se cambia el estado sin guía, el correo va sin número de rastreo.
El pago lo confirma Mercado Pago solo: cuando el pago se aprueba, el pedido pasa a pagado, se descuenta el stock y salen los correos (al cliente y a la tienda). No hay que marcar nada a mano. Si un pedido aparece "pendiente" es que el pago no se completó; el detalle tiene una explicación de por qué no se completó (tarjeta rechazada, fondos, etc.).

=== CLIENTES ===
La base de clientes: cuántos pedidos lleva cada uno, cuánto ha comprado en total, su última compra, si está suscrito a correos y si verificó su cuenta. Se puede ordenar por "mejores clientes" o por "más recientes". Sirve para saber a quién consentir con una promoción.

=== CÓDIGOS DE DESCUENTO ===
Se crea un código (por ejemplo AROMAS10) eligiendo el tipo: porcentaje (%) o monto fijo en pesos, con fecha de expiración y máximo de usos, ambos opcionales. Los códigos existentes se pueden desactivar.
REGLA FIJA: el descuento NUNCA se aplica al costo del envío, solo al valor de los productos. Es una decisión del negocio, no un error.

=== INVENTARIO (crear y editar productos) ===
Los productos se ven en una parrilla igual a la de la tienda. Al hacer clic en uno se abre su ficha para editar; con "Añadir producto" se abre la misma ficha en blanco.
Campos: título del producto (obligatorio), precio en pesos (obligatorio), "antes" (precio tachado, para mostrar oferta), descripción, título opcional arriba de la descripción, categoría, stock y si está visible en la tienda u oculto.
Imágenes: se suben varias y con "Hacer principal" se elige cuál sale primero en la tienda.
A la derecha hay una vista previa: "Así se verá en la tienda".
Los cambios SOLO quedan publicados al pulsar "Guardar cambios"; hasta entonces no pasa nada en la tienda. Al guardar, la tienda se actualiza enseguida.
Poner el stock en 0 hace que el producto salga como "Agotado". Para esconderlo del todo, se marca como oculto. Cuando un producto se agota, llega un correo de aviso a la tienda.

=== SEO ===
Es el texto con el que la tienda aparece en Google; no cambia nada de lo que ve el cliente dentro de la página. Por cada página clave (inicio, catálogo, ofertas, arma tu kit) y por cada producto se escribe:
- Meta título: el renglón azul de Google. Ideal ~55 caracteres, lo importante primero, distinto en cada página.
- Meta descripción: el texto gris de abajo. Ideal ~150 caracteres, con un beneficio y una invitación ("Envíos a todo Colombia").
Hay contador de caracteres y una vista previa de cómo se vería en Google. Si se dejan vacíos, se usa un texto por defecto: nunca queda en blanco. Los cambios se guardan con el botón de guardar de esa sección. Google puede tardar días en mostrar el texto nuevo: es normal, no es un error del panel.

=== ASISTENTE WHATSAPP ===
Es la asesora virtual que atiende a los CLIENTES por WhatsApp (distinta de este chat de ayuda). Tiene tres pestañas: Conversaciones (leer chats y responder a mano, lo que pausa el bot en esa conversación), Configuración (nombre de la asesora, saludo, instrucciones de tono, datos del local, catálogo en PDF y preguntas frecuentes) y Número conectado (estado de la conexión).

=== ESTE CHAT DE AYUDA ===
Tú eres la burbuja de chat de abajo a la derecha del panel. En tu encabezado hay un botón de borrador para empezar una conversación nueva desde cero (útil si se cambia de tema) y una X para cerrar el chat. La conversación no se guarda: al recargar el panel se empieza de nuevo.

=== BOTONCITOS "?" ===
En varios campos hay un botón pequeño con un signo de interrogación: al pulsarlo se abre una explicación corta de ese campo con ejemplos. Vale la pena recomendárselo cuando la pregunta sea sobre un campo puntual.

=== COSAS QUE NO SE HACEN DESDE EL PANEL ===
Cambiar precios de envío, textos fijos de la tienda, correos automáticos, el diseño o los banners son cambios de código: para eso hay que escribirle a Andrés. El panel tampoco borra pedidos ni clientes.
`.trim()
