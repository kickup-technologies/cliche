/**
 * Contenido y tipos de la landing /arma-tu-kit que usa el CLIENTE. Sin
 * imports a propósito: así el bundle del navegador no arrastra el catálogo.
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
  /** etiqueta de familia olfativa (misma que /catalogo) */
  family: string | null
  /** "Ideal para…" (documento de distribuidores / segmentos) */
  idealFor: string | null
  /** segmentos B2B (lib/segments) para los filtros de "¿para qué lo quieres?" */
  segments: string[]
  /** insignia de la BD "Más vendido"/"Top Ventas" */
  bestSeller: boolean
}

/** Reseña real aprobada (tabla `reviews`) para el bloque de testimonios. */
export interface KitReview {
  id: string
  name: string
  rating: number
  comment: string
  aroma: string | null
}

/**
 * Cómo se usa — MISMO texto que la ficha de producto
 * (components/product-detail.tsx, acordeón "¿Cómo usarlo?").
 * Si cambia allá, actualizarlo aquí.
 */
export const USAGE_TIPS = [
  { title: "En espacios", desc: "Aplica 3-5 puf en habitaciones de hasta 20m²." },
  { title: "En la ropa", desc: "3 puf en prendas superiores, 5 en jeans e inferiores." },
  { title: "Duración", desc: "Efecto olfativo hasta 8 horas en espacios cerrados." },
  { title: "Precauciones", desc: "Evitar contacto con ojos. Alejar de menores de edad." },
] as const

/**
 * Atajo "Sugerencia de Navidad" de la maqueta de la agencia (curaduría, no un
 * dato). Solo se muestra si el Aroma Navidad está activo; los aromas que no
 * estén activos se omiten. Confirmar la combinación con la clienta.
 */
export const CHRISTMAS_COMBO = ["navidad", "calor-de-lana", "tierra"] as const

/**
 * Contenido de la maqueta que NO se publica porque no está comprobado en el
 * repo ni en la BD. Queda aquí desactivado para que la clienta lo confirme;
 * cuando lo confirme, se mueve a la página con su fuente.
 */
export const PENDING_MOCKUP_CONTENT = {
  enabled: false,
  testimonialsWithNames: [
    "Mariana G. · Boutique · Bogotá (Brillos de Seda)",
    "Catalina R. · Ropa infantil · Medellín (Vientos de Lino)",
    "Andrés P. · Hotel boutique · Cali (Tierra)",
    "Laura V. · Accesorios · Barranquilla (Romeo y Julieta)",
    "Daniela M. · Spa · Bogotá (Sello de Dios)",
    "Camila T. · Marca deportiva · Bucaramanga (Eternamente Índigo)",
    "Valentina H. · Marca premium · Cartagena (Luxury)",
  ],
  claims: [
    "Calificación y número de reseñas por aroma (★ 4,3 · 9 reseñas…)",
    "Despacho al día siguiente",
    "30 días para cambios o devoluciones (los términos dicen otra cosa: garantía con condiciones y sin devolución por preferencia de olor)",
    "Fecha límite de Navidad: «pide hasta el jueves 10 de diciembre»",
    "Hecho en Medellín (el sitio dice «Hecho en Colombia»)",
    "Pago contra entrega / en efectivo (Cliché no lo ofrece)",
  ],
} as const
