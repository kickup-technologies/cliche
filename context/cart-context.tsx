"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { Product } from "@/lib/supabase"

interface CartItem {
  product: Product
  quantity: number
}

interface CartContextType {
  items: CartItem[]
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  total: number
  itemCount: number
  checkout: (discountCode?: string, email?: string) => Promise<void>
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

  const openDrawer = useCallback(() => setIsDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), [])

  // Persistir carrito en localStorage
  useEffect(() => {
    const saved = localStorage.getItem("cliche-cart")
    if (saved) setItems(JSON.parse(saved))
  }, [])

  useEffect(() => {
    localStorage.setItem("cliche-cart", JSON.stringify(items))
  }, [items])

  const addItem = useCallback((product: Product) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }, [])

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

  const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)

  const checkout = useCallback(async (discountCode?: string, email?: string) => {
    if (!items.length) return
    setIsCheckingOut(true)

    // CAPI: InitiateCheckout
    const total = items.reduce((s, i) => s + i.product.price * i.quantity, 0)
    fetch('/api/capi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: 'InitiateCheckout',
        event_source_url: window.location.href,
        event_id: `${Date.now()}_checkout`,
        custom_data: {
          currency: 'COP',
          value: total,
          num_items: items.reduce((s, i) => s + i.quantity, 0),
          content_ids: items.map((i) => i.product.id),
        },
      }),
    }).catch(() => {})

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
          discountCode,
          customerEmail: email,
        }),
      })

      const data = await res.json()
      if (data.url) {
        clearCart()
        window.location.href = data.url
      } else {
        alert(data.error || "Error al procesar el pago")
      }
    } catch {
      alert("Error de conexión. Intenta de nuevo.")
    } finally {
      setIsCheckingOut(false)
    }
  }, [items, clearCart])

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, total, itemCount, checkout, isCheckingOut, isDrawerOpen, openDrawer, closeDrawer }}
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
