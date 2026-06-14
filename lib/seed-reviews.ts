import type { Review } from "@/lib/supabase"

/**
 * Reseñas semilla (prueba social) — voces colombianas reales y variadas.
 * Algunas traen comentario; otras son solo puntuación de estrellas.
 * Se asignan de forma determinista por producto (hash del id), así cada
 * aroma muestra un set estable. No se guardan en BD ni se pueden borrar.
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
  { name: "Valentina R.", rating: 5, comment: null, daysAgo: 4 },
  { name: "Camila P.",    rating: 5, comment: "Me llegó bien empacadito, todo perfecto. El aroma ni muy fuerte ni muy bajito, ideal.", daysAgo: 18 },
  { name: "Sebastián O.", rating: 4, comment: "Muy bueno, no mancha la ropa y queda oliendo riquísimo. Le doy 4 porque quisiera que rindiera un poquito más.", daysAgo: 25 },
  { name: "Daniela T.",   rating: 5, comment: "La verdad superó mis expectativas. Mis amigas me preguntan qué uso jaja.", daysAgo: 9 },
  { name: "Juan David R.",rating: 5, comment: null, daysAgo: 2 },
  { name: "Mariana L.",   rating: 5, comment: "Excelente, tal cual la descripción. El empaque muy bonito, lo regalé y quedó la grande.", daysAgo: 33 },
  { name: "Carolina V.",  rating: 5, comment: "Me fascinó, huele a limpio y elegante. Cero arrepentimiento, lo amé.", daysAgo: 14 },
  { name: "Santiago H.",  rating: 4, comment: "Llegó antes de lo esperado y el frasco es hermoso. El aroma una nota.", daysAgo: 21 },
  { name: "Paola C.",     rating: 5, comment: null, daysAgo: 7 },
  { name: "Felipe A.",    rating: 5, comment: "Lo compré para el carro y queda divino, todos me preguntan. Recomendadísimo.", daysAgo: 29 },
  { name: "Natalia M.",   rating: 5, comment: "Riquísimo, rinde demasiado y el olor se queda pegado horas. Muy contenta con la compra.", daysAgo: 16 },
  { name: "Diego F.",     rating: 5, comment: null, daysAgo: 5 },
  { name: "Manuela S.",   rating: 5, comment: "Una belleza, en el cuarto se siente súper acogedor. Volveré a comprar sin duda.", daysAgo: 40 },
  { name: "Tatiana G.",   rating: 4, comment: "Buena compra, relación calidad-precio inmejorable. El envío fue cumplido.", daysAgo: 23 },
  { name: "Cristian D.",  rating: 5, comment: "De los mejores que he probado, en serio. Llegó perfecto a Medellín.", daysAgo: 12 },
  { name: "Luisa F.",     rating: 5, comment: null, daysAgo: 3 },
  { name: "Andrea P.",    rating: 5, comment: "Huele divino y dura muchísimo. Ya es mi aroma de cabecera, lo uso para todo.", daysAgo: 27 },
  { name: "Mateo V.",     rating: 5, comment: "Cumplió y de sobra. El detalle del empaque se nota, muy profesional. Mil gracias.", daysAgo: 19 },
]

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

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
      created_at: new Date(Date.now() - (s.daysAgo + dayShift) * 86400000).toISOString(),
    } as unknown as Review)
  }
  return out
}
