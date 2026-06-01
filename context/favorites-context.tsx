"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { Product } from "@/lib/supabase"
import { useCAPI } from "@/lib/use-capi"

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
  const { track } = useCAPI()

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
        // ── Meta Pixel + CAPI: AddToWishlist (solo al AGREGAR) ──
        track({
          event_name: "AddToWishlist",
          custom_data: {
            currency: "COP",
            value: product.price,
            content_ids: [product.id],
            content_name: product.name,
            content_type: "product",
          },
        })
      }
      return next
    })
  }, [track])

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
