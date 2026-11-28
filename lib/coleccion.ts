import type { Product } from "@/lib/supabase"

/**
 * «Colección de Navidad» (diciembre 2026): cuatro aromas de 250 ml FIJOS —
 * Navidad, Calor de Lana, Tierra y Sello de Dios (los de la foto y los
 * videos de pauta). La persona no escoge nada: solo cuántas Colecciones.
 * Vive en el código (no en la tabla `products`) y se cobra como un kit de 4
 * con esos componentes, así el panel, la bodega y Dropi ven los 4 frascos.
 */
export const COLECCION_SLUG = "coleccion-navidad"
export const COLECCION_PATH = `/productos/${COLECCION_SLUG}`
export const COLECCION_NOMBRE = "Colección de Navidad"
export const COLECCION_FOTO = "/images/products/coleccion-navidad.jpg"

/** Los cuatro aromas, con las notas tal como las dice su etiqueta. */
export const COLECCION_AROMAS = [
  { slug: "aroma-navidad", nombre: "Navidad", notas: "Notas navideñas" },
  { slug: "aroma-calor-de-lana", nombre: "Calor de Lana", notas: "Frutales, florales y almizcles" },
  { slug: "aroma-tierra", nombre: "Tierra", notas: "Florales" },
  { slug: "aroma-sello-de-dios", nombre: "Sello de Dios", notas: "Rosas blancas" },
] as const
export const COLECCION_SLUGS: readonly string[] = COLECCION_AROMAS.map((a) => a.slug)

/**
 * Black Friday: hasta el lunes 30 (hora de Colombia), llevar 2 o 3
 * Colecciones tiene rebaja; desde el 1 de diciembre cada una vale lo mismo.
 * El servidor cobra con su reloj, así el contador de la ficha dice la verdad.
 */
export const BLACK_FRIDAY = {
  desde: Date.parse("2026-11-27T00:00:00-05:00"),
  hasta: Date.parse("2026-12-01T00:00:00-05:00"),
} as const
export const enBlackFriday = (ahora = Date.now()) => ahora >= BLACK_FRIDAY.desde && ahora < BLACK_FRIDAY.hasta

export const COLECCION_CANTIDADES = [1, 2, 3] as const
export const PRECIO_COLECCION = 190_000
/** Precio de CADA Colección al llevar 2 o 3 en Black Friday ($342.000 y $480.000). */
const PRECIO_BF: Record<number, number> = { 2: 171_000, 3: 160_000 }

export const cantidadColeccion = (n: unknown) => ((COLECCION_CANTIDADES as readonly number[]).includes(Number(n)) ? Number(n) : 1)
export const precioColeccion = (n: number, bf: boolean) => (bf && PRECIO_BF[n]) || PRECIO_COLECCION
export const totalColecciones = (n: number, bf: boolean) => precioColeccion(n, bf) * n
/** Lo que valen esos frascos comprados por separado (lo tachado). */
export const separadoColecciones = (aromas: { price: number }[], n: number) => aromas.reduce((s, a) => s + a.price, 0) * n

/** Los aromas de la Colección en su orden, con los productos que haya. */
export function aromasColeccion(productos: Product[]): Product[] {
  return COLECCION_SLUGS.map((s) => productos.find((p) => p.slug === s)).filter((p): p is Product => Boolean(p))
}

/** La Colección como producto (para la ficha y el SEO). null si falta algún aroma. */
export function productoColeccion(aromas: Product[]): Product | null {
  if (aromas.length < COLECCION_SLUGS.length || aromas.some((a) => a.is_active === false)) return null
  return {
    id: COLECCION_SLUG,
    name: COLECCION_NOMBRE,
    slug: COLECCION_SLUG,
    price: PRECIO_COLECCION,
    original_price: null,
    description:
      "Diciembre se celebra en casa. La Colección de Navidad trae cuatro aromas de 250 ml de Cliché: Navidad para la sala y la novena, Calor de Lana para los cuartos, Tierra para la entrada y Sello de Dios para la ropa de cama.\n\nCon 3 a 5 pufs perfumas un espacio de unos 20 m²; también sirve para prendas, sábanas y cortinas.",
    image_url: COLECCION_FOTO,
    image_urls: [COLECCION_FOTO, ...aromas.map((a) => (Array.isArray(a.image_urls) && a.image_urls.find(Boolean)) || a.image_url).filter(Boolean)],
    category: null,
    badge: enBlackFriday() ? "BLACK FRIDAY" : "NAVIDAD",
    badge_color: "bg-primary",
    stock: Math.min(...aromas.map((a) => (typeof a.stock === "number" ? a.stock : 99))),
    rating: 0,
    reviews: 0,
    is_active: true,
    created_at: "2026-11-27T00:00:00-05:00",
  }
}
