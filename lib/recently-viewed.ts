"use client"

import { useEffect, useState } from "react"
import type { Product } from "@/lib/supabase"

/**
 * Historial de productos vistos en la sesión del navegador.
 * Persiste en localStorage (sobrevive recargas y navegación entre productos),
 * dedupe por slug, más reciente primero, máximo 12.
 */
const KEY = "cliche_recently_viewed"
const MAX = 12

export interface RecentItem {
  id: string
  slug: string
  name: string
  image_url: string | null
  price: number
  ts: number
}

function read(): RecentItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as RecentItem[]) : []
  } catch {
    return []
  }
}

/** Registra que el usuario vio este producto (lo mueve al frente del historial). */
export function recordView(p: Product) {
  if (typeof window === "undefined") return
  try {
    const list = read().filter((i) => i.slug !== p.slug)
    list.unshift({
      id: p.id,
      slug: p.slug,
      name: p.name,
      image_url: p.image_url ?? null,
      price: p.price,
      ts: Date.now(),
    })
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
    // Notifica a otros componentes montados en la misma pestaña
    window.dispatchEvent(new Event("cliche:recently-viewed"))
  } catch {
    /* almacenamiento no disponible */
  }
}

/** Hook que devuelve el historial (opcionalmente excluyendo un slug, p.ej. el actual). */
export function useRecentlyViewed(excludeSlug?: string): RecentItem[] {
  const [items, setItems] = useState<RecentItem[]>([])

  useEffect(() => {
    const load = () => {
      const list = read()
      setItems(excludeSlug ? list.filter((i) => i.slug !== excludeSlug) : list)
    }
    load()
    window.addEventListener("cliche:recently-viewed", load)
    window.addEventListener("storage", load)
    return () => {
      window.removeEventListener("cliche:recently-viewed", load)
      window.removeEventListener("storage", load)
    }
  }, [excludeSlug])

  return items
}
