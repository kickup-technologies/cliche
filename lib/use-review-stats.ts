"use client"

import { useEffect, useState } from "react"
import type { Review } from "@/lib/supabase"

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
 * Fuente única de verdad para promedio y conteo de reseñas de un producto:
 * SOLO las reales de la BD, igual que la sección de reseñas, así el rating del
 * tope y el de la sección siempre coinciden. Arranca en cero (sin estrellas)
 * y se completa al llegar las reales.
 */
export function useReviewStats(productId: string): ReviewStats {
  const [stats, setStats] = useState<ReviewStats>({ count: 0, avg: 0 })

  useEffect(() => {
    let active = true
    setStats({ count: 0, avg: 0 })
    fetch(`/api/reviews?product_id=${productId}`)
      .then((r) => r.json())
      .then((real: Review[]) => {
        if (!active) return
        setStats(computeStats(Array.isArray(real) ? real : []))
      })
      .catch(() => {})
    return () => { active = false }
  }, [productId])

  return stats
}
