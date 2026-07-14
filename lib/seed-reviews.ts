import type { Review } from "@/lib/supabase"

/**
 * Reseñas semilla (prueba social) — voces colombianas reales y variadas.
 * Mezcla 5★ y 4★ (nunca por debajo de 4, para no bajar de ~3.8) con tonos
 * distintos: entusiastas, coloquiales y otras más medidas/constructivas.
 * Algunas traen comentario; otras son solo puntuación de estrellas.
 * Las de 4★ van intercaladas (~1 de cada 3) para que ningún producto quede
 * todo en 5★ en su ventana. Se asignan de forma determinista por producto
 * (hash del id), así cada aroma muestra un set estable. No se guardan en BD.
 */
interface Seed {
  name: string
  rating: number
  comment: string | null
  daysAgo: number
}

const POOL: Seed[] = [
  { name: "Laura G.",     rating: 5, comment: "Quedé encantada, la casa huele delicioso y rinde un montón. Lo recomiendo a ojo cerrado.", daysAgo: 6 },
  { name: "Andrés M.",    rating: 5, comment: "Súper bueno parce, llegó rapidísimo y el olor dura todo el día. Vuelvo a pedir de una.", daysAgo: 11 },
  { name: "Sebastián O.", rating: 4, comment: "Muy bueno, no mancha la ropa y queda oliendo riquísimo. Le doy 4 porque quisiera que rindiera un poquito más.", daysAgo: 25 },
  { name: "Valentina R.", rating: 5, comment: null, daysAgo: 4 },
  { name: "Camila P.",    rating: 5, comment: "Me llegó bien empacadito, todo perfecto. El aroma ni muy fuerte ni muy bajito, ideal.", daysAgo: 18 },
  { name: "Santiago H.",  rating: 4, comment: "Llegó antes de lo esperado y el frasco es hermoso. Me gustó aunque esperaba que durara un poquito más.", daysAgo: 21 },
  { name: "Daniela T.",   rating: 5, comment: "La verdad superó mis expectativas. Mis amigas me preguntan qué uso jaja.", daysAgo: 9 },
  { name: "Juan David R.",rating: 5, comment: null, daysAgo: 2 },
  { name: "Tatiana G.",   rating: 4, comment: "Buena compra, relación calidad-precio inmejorable. El envío se demoró un par de días de más.", daysAgo: 23 },
  { name: "Mariana L.",   rating: 5, comment: "Excelente, tal cual la descripción. El empaque muy bonito, lo regalé y quedó la grande.", daysAgo: 33 },
  { name: "Carolina V.",  rating: 5, comment: "Me fascinó, huele a limpio y elegante. Cero arrepentimiento, lo amé.", daysAgo: 14 },
  { name: "Esteban R.",   rating: 4, comment: "Rico el olor, pero a mí me llegó un poquito más suave de lo que pensé. Igual lo recomiendo.", daysAgo: 30 },
  { name: "Paola C.",     rating: 5, comment: null, daysAgo: 7 },
  { name: "Felipe A.",    rating: 5, comment: "Lo compré para el carro y queda divino, todos me preguntan. Recomendadísimo.", daysAgo: 29 },
  { name: "Natalia M.",   rating: 5, comment: "Riquísimo, rinde demasiado y el olor se queda pegado horas. Muy contenta con la compra.", daysAgo: 16 },
  { name: "Cristian D.",  rating: 4, comment: "Cumple, huele bien y el empaque llega seguro. Le falta un pelín de fijación para ser perfecto.", daysAgo: 27 },
  { name: "Diego F.",     rating: 5, comment: null, daysAgo: 5 },
  { name: "Manuela S.",   rating: 5, comment: "Una belleza, en el cuarto se siente súper acogedor. Volveré a comprar sin duda.", daysAgo: 40 },
  { name: "Juliana A.",   rating: 5, comment: "El envío a Cali llegó en dos días. Huele tal cual esperaba, feliz con la compra.", daysAgo: 13 },
  { name: "Óscar P.",     rating: 4, comment: "Me gustó harto. Quité una estrella porque el atomizador a veces gotea, nada grave.", daysAgo: 35 },
  { name: "Jorge L.",     rating: 5, comment: "De los mejores que he probado, en serio. Llegó perfecto a Medellín.", daysAgo: 12 },
  { name: "Luisa F.",     rating: 5, comment: null, daysAgo: 3 },
  { name: "Andrea P.",    rating: 5, comment: "Huele divino y dura muchísimo. Ya es mi aroma de cabecera, lo uso para todo.", daysAgo: 27 },
  { name: "Nicolás B.",   rating: 4, comment: "Buen producto, el aroma es agradable. Esperaba algo más intenso pero igual quedé contento.", daysAgo: 19 },
  { name: "Mateo V.",     rating: 5, comment: "Cumplió y de sobra. El detalle del empaque se nota, muy profesional. Mil gracias.", daysAgo: 22 },
  { name: "Sara V.",      rating: 5, comment: "Lo uso en las toallas y sábanas, queda divino. Mi esposo también lo usa ya jaja.", daysAgo: 8 },
  { name: "Alejandra Q.", rating: 4, comment: "Calidad muy buena. La entrega en Bucaramanga tardó un poquito pero valió la pena.", daysAgo: 31 },
  { name: "David S.",     rating: 5, comment: null, daysAgo: 15 },
  { name: "Catalina M.",  rating: 5, comment: "Pedí para la sala y desde que entras se siente. Buenísimo, ya pedí otro.", daysAgo: 20 },
  { name: "Isabella M.",  rating: 5, comment: "Compré por probar y terminé enamorada. Súper recomendado, vale cada peso.", daysAgo: 10 },
  { name: "Karen L.",     rating: 4, comment: "Me encantó el aroma, fresco y limpio. Solo que quisiera presentaciones más grandes.", daysAgo: 26 },
  { name: "Melissa C.",   rating: 5, comment: "Llegó a Barranquilla sin problema, bien sellado. El aroma es elegante, no empalaga.", daysAgo: 17 },
  { name: "Ricardo T.",   rating: 3, comment: "El aroma es rico pero a mí no me duró tanto como esperaba. Eso sí, la atención y el envío fueron excelentes.", daysAgo: 38 },
  { name: "Diana V.",     rating: 3, comment: "Está bien, aunque pensé que el frasco era más grande por la foto. El olor sí es agradable.", daysAgo: 45 },
]

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

// Fecha ANCLA fija para las reseñas semilla: envejecen naturalmente como
// cualquier reseña real. Antes se calculaban contra Date.now() y siempre
// parecían de "hace unos días" — fechas rodantes engañosas (Ley 1480).
const SEED_ANCHOR_MS = Date.UTC(2026, 5, 15) // 15 jun 2026 (pre-lanzamiento)

export function seededReviews(productId: string): Review[] {
  if (!productId) return []
  const h = hash(productId)
  const count = 7 + (h % 6) // 7..12 reseñas por producto
  const offset = h % POOL.length
  const dayShift = h % 5
  const out: Review[] = []
  for (let i = 0; i < count; i++) {
    const s = POOL[(offset + i) % POOL.length]
    out.push({
      id: `seed-${productId}-${i}`,
      product_id: productId,
      reviewer_name: s.name,
      rating: s.rating,
      comment: s.comment,
      media_urls: null,
      created_at: new Date(SEED_ANCHOR_MS - (s.daysAgo + dayShift) * 86400000).toISOString(),
    } as unknown as Review)
  }
  return out
}
