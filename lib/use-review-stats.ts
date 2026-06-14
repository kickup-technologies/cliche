"use client"

import { useEffect, useState } from "react"
import type { Review } from "@/lib/supabase"
import { seededReviews } from "@/lib/seed-reviews"

export interface ReviewStats {
  count: number
  avg: number
}

function computeStats(rs: { rating: number }[]): ReviewStats {
  const count = rs.length
  const avg = count ? rs.reduce((s, r) => s + r.rating, 0) / count : 0
  return { count, avg }
}

/**
 * Fuente única de verdad para promedio y conteo de reseñas de un producto.
 * Combina las reseñas semilla (deterministas) con las reales de la BD, igual
 * que la sección de reseñas — así el rating del tope y el de la sección SIEMPRE
 * coinciden. El valor inicial (solo semilla) es determinista → sin hydration
 * mismatch; al llegar las reales se recalcula.
 */
export function useReviewStats(productId: string): ReviewStats {
  const [stats, setStats] = useState<ReviewStats>(() =>
    computeStats(seededReviews(productId)),
  )

  useEffect(() => {
    let active = true
    setStats(computeStats(seededReviews(productId)))
    fetch(`/api/reviews?product_id=${productId}`)
      .then((r) => r.json())
      .then((real: Review[]) => {
        if (!active) return
        const all = [...(Array.isArray(real) ? real : []), ...seededReviews(productId)]
        setStats(computeStats(all))
      })
      .catch(() => {})
    return () => { active = false }
  }, [productId])

  return stats
}
