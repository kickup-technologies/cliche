"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { Product } from "@/lib/supabase"

interface FavoritesContextType {
  ids: Set<string>
  products: Product[]
  toggleFavorite: (product: Product) => void
  isFavorite: (productId: string) => boolean
  count: number
}

const FavoritesContext = createContext<FavoritesContextType | null>(null)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<Set<string>>(new Set())
  const [products, setProducts] = useState<Product[]>([])

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cliche-favorites")
      if (saved) {
        const parsed: Product[] = JSON.parse(saved)
        setProducts(parsed)
        setIds(new Set(parsed.map((p) => p.id)))
      }
    } catch {}
  }, [])

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem("cliche-favorites", JSON.stringify(products))
  }, [products])

  const toggleFavorite = useCallback((product: Product) => {
    setIds((prev) => {
      const next = new Set(prev)
      if (next.has(product.id)) {
        next.delete(product.id)
        setProducts((ps) => ps.filter((p) => p.id !== product.id))
      } else {
        next.add(product.id)
        setProducts((ps) => [...ps, product])
      }
      return next
    })
  }, [])

  const isFavorite = useCallback((productId: string) => ids.has(productId), [ids])

  return (
    <FavoritesContext.Provider value={{ ids, products, toggleFavorite, isFavorite, count: ids.size }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider")
  return ctx
}
