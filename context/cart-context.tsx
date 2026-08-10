"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { Product } from "@/lib/supabase"
import { useCAPI } from "@/lib/use-capi"
import type { PriceTier } from "@/lib/pricing"
import { PRODUCT_PLACEHOLDER } from "@/lib/placeholder"

/** Componente de un kit personalizado: un aroma concreto y cuántos frascos. */
export interface PackComponent {
  product_id: string
  name: string
  quantity: number
  image_url: string
}

/** Metadatos del kit personalizado adjuntos a una línea de carrito. */
export interface PackMeta {
  tier: string // id del tier (x3/x4/x6)
  units: number
  components: PackComponent[]
}

export interface CartItem {
  product: Product
  quantity: number
  // Presente solo en líneas de "kit personalizado" (varios aromas, precio fijo del tier).
  pack?: PackMeta
}

interface CartContextType {
  items: CartItem[]
  addItem: (product: Product, quantity?: number) => void
  addPack: (tier: PriceTier, components: PackComponent[]) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  replaceCart: (items: CartItem[]) => void
  hydrated: boolean
  total: number
  itemCount: number
  checkout: () => void
  isCheckingOut: boolean
  isDrawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  // `hydrated` evita que la persistencia inicial escriba [] (sobreescribiendo el
  // carrito guardado) y permite que CartSync espere a tener el carrito real.
  const [hydrated, setHydrated] = useState(false)
  const { track } = useCAPI()

  const openDrawer = useCallback(() => setIsDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), [])

  // Cargar carrito de localStorage (una vez) y marcar hidratado.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cliche-cart")
      if (saved) setItems(JSON.parse(saved))
    } catch {}
    setHydrated(true)
  }, [])

  // Persistir SOLO después de hidratar (no pisar el guardado con el [] inicial).
  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem("cliche-cart", JSON.stringify(items))
  }, [items, hydrated])

  const addItem = useCallback((product: Product, quantity: number = 1) => {
    const qty = Math.max(1, quantity)
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + qty } : i
        )
      }
      return [...prev, { product, quantity: qty }]
    })
    // ── Meta Pixel + CAPI: AddToCart (1 evento, num_items real) ──
    track({
      event_name: "AddToCart",
      custom_data: {
        currency: "COP",
        value: product.price * qty,
        content_ids: [product.id],
        content_name: product.name,
        content_type: "product",
        num_items: qty,
      },
    })
  }, [track])

  // Añade un "kit personalizado": una línea con precio fijo del tier y la lista
  // de aromas elegidos. Cada pack es único (no se fusiona con otros) para poder
  // armar varios distintos. La imagen es la del primer aroma elegido.
  const addPack = useCallback((tier: PriceTier, components: PackComponent[]) => {
    const id = `pack::${tier.id}::${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    const aromaNames = components.flatMap((c) => Array(c.quantity).fill(c.name))
    const synthetic: Product = {
      id,
      name: `Kit personalizado x${tier.units}`,
      slug: "kit-personalizado",
      price: tier.price,
      original_price: tier.units * 78000,
      description: aromaNames.join(" · "),
      image_url: components[0]?.image_url || PRODUCT_PLACEHOLDER,
      image_urls: [],
      badge: "Personalizado",
      badge_color: null,
      stock: 9999,
      rating: 0,
      reviews: 0,
      is_active: true,
      created_at: new Date().toISOString(),
    }
    setItems((prev) => [
      ...prev,
      { product: synthetic, quantity: 1, pack: { tier: tier.id, units: tier.units, components } },
    ])
    track({
      event_name: "AddToCart",
      custom_data: {
        currency: "COP",
        value: tier.price,
        content_ids: components.map((c) => c.product_id),
        content_name: synthetic.name,
        content_type: "product_group",
        num_items: tier.units,
      },
    })
  }, [track])

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId))
  }, [])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId)
      return
    }
    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i))
    )
  }, [removeItem])

  const clearCart = useCallback(() => setItems([]), [])
  // Reemplaza el carrito completo (lo usa la sincronización con la cuenta).
  const replaceCart = useCallback((next: CartItem[]) => setItems(next), [])

  const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)

  const checkout = useCallback(async () => {
    if (!items.length) return
    // ── Meta Pixel + CAPI: InitiateCheckout ──
    track({
      event_name: "InitiateCheckout",
      custom_data: {
        currency: "COP",
        value: items.reduce((s, i) => s + i.product.price * i.quantity, 0),
        content_ids: items.map((i) => i.product.id),
        content_type: "product",
        num_items: items.reduce((s, i) => s + i.quantity, 0),
      },
    })
    // Redirigir a la página de resumen de checkout
    window.location.href = "/checkout"
  }, [items, track])

  return (
    <CartContext.Provider
      value={{ items, addItem, addPack, removeItem, updateQuantity, clearCart, replaceCart, hydrated, total, itemCount, checkout, isCheckingOut, isDrawerOpen, openDrawer, closeDrawer }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}
