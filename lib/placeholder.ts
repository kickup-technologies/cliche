/**
 * Imagen de reserva para un producto sin foto (recién dado de alta desde el
 * panel, o con la URL rota).
 *
 * Antes cada archivo inventaba su propia ruta: `/images/placeholder.jpg` (que
 * NO existe → imagen rota en catálogo, carrito, favoritos, ofertas y correos)
 * y `/placeholder.jpg` (un JPEG de 1×1 px, es decir un rectángulo de color
 * plano). Ahora hay una sola ruta, con una silueta de frasco en el beige de la
 * marca, y se importa de aquí para que no vuelva a divergir.
 */
export const PRODUCT_PLACEHOLDER = "/images/placeholder.png"
