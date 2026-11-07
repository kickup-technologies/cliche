/**
 * Contenido y tipos de la landing /arma-tu-kit que usa el CLIENTE. Sin
 * imports a propósito: así el bundle del navegador no arrastra el catálogo.
 *
 * La landing copia la maqueta de Cliché (landings/kits-cliche) tal cual; los
 * DATOS (aromas, notas, fotos, insignias, stock, precios, envío) salen de la
 * BD y de las fuentes del repo. Lo que viene de la maqueta y no es un dato
 * (filtros por uso, combinación de Navidad, textos) vive aquí.
 */

/** Aroma listo para el armador (serializable: viaja del server al cliente). */
export interface KitAroma {
  /** id del producto en la BD (= content_id del catálogo de Meta) */
  id: string
  /** nombre corto para la tarjeta ("Tierra") */
  name: string
  /** nombre completo de la BD (es el que viaja en el pedido) */
  fullName: string
  slug: string
  image: string
  stock: number
  badge: string | null
  notes: string[]
  /** "Ideal para · familia", la línea gris de la tarjeta de la maqueta */
  idealLine: string | null
  /** usos de la maqueta (USOS) para el filtro "¿Para qué lo quieres?" */
  uses: string[]
  /** insignia de la BD "Más vendido"/"Top Ventas" */
  bestSeller: boolean
  /** calificación SOLO con reseñas reales aprobadas (tabla `reviews`) */
  rating: number | null
  ratingCount: number
}

/**
 * Filtro "¿Para qué lo quieres?" — mismos chips y en el mismo orden que la
 * maqueta. Un chip sin aromas activos no se muestra.
 */
export const USOS = [
  { key: "todos", label: "Todos" },
  { key: "boutique", label: "Boutique y ropa femenina" },
  { key: "deportiva", label: "Deportiva y unisex" },
  { key: "infantil", label: "Infantil" },
  { key: "playa", label: "Playa y vestidos de baño" },
  { key: "mascotas", label: "Mascotas" },
  { key: "hotel", label: "Hoteles y spas" },
  { key: "accesorios", label: "Accesorios y calzado" },
  { key: "hogar", label: "Casa y ropa" },
] as const

/**
 * Atajo "Sugerencia de Navidad" de la maqueta. Solo se muestra si el Aroma
 * Navidad está activo; los aromas que no estén activos se omiten.
 */
export const CHRISTMAS_COMBO = ["navidad", "calor-de-lana", "tierra"] as const

/**
 * Fecha límite de Navidad de la maqueta ("Pide hasta el jueves 10 de
 * diciembre"): con la entrega de 7 a 9 días hábiles de entonces, un pedido de ese
 * día llegaba a más tardar el 23 (hoy llega en 2 a 3: la fecha queda con margen). Pasada la fecha, la frase y la pregunta
 * "¿Llega para Navidad?" se ocultan solas (nada de urgencia vencida).
 */
export const CHRISTMAS_DEADLINE = "2026-12-10T23:59:59-05:00"
export const CHRISTMAS_DEADLINE_LABEL = "el jueves 10 de diciembre"

/**
 * Cómo se usa — textos de la maqueta. Los datos son los mismos de la ficha de
 * producto (components/product-detail.tsx, acordeón "¿Cómo usarlo?"): si
 * cambian allá, actualizarlos aquí.
 */
export const USAGE_TIPS = [
  { title: "En espacios", desc: "De 3 a 5 puf en habitaciones de hasta 20 m²." },
  { title: "En la ropa", desc: "3 puf en prendas superiores y 5 en jeans e inferiores." },
  { title: "Duración", desc: "El aroma se siente hasta 8 horas en espacios cerrados." },
] as const
