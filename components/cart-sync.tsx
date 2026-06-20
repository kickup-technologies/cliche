"use client"

import { useEffect, useRef } from "react"
import { useAuth } from "@/context/auth-context"
import { useCart, type CartItem } from "@/context/cart-context"
import { getSupabaseBrowser } from "@/lib/supabase/client"

/**
 * Sincroniza el carrito con la cuenta del usuario (tabla user_carts, aislada por
 * RLS → cada quien solo ve/escribe el SUYO).
 *  - Al iniciar sesión: carga el carrito guardado y lo fusiona con el de invitado.
 *  - Mientras hay sesión: guarda los cambios (debounce).
 *  - Al cerrar sesión: el carrito local queda como carrito de invitado.
 */
function mergeCarts(a: CartItem[], b: CartItem[]): CartItem[] {
  const map = new Map<string, CartItem>()
  for (const it of [...a, ...b]) {
    const existing = map.get(it.product.id)
    if (existing) existing.quantity += it.quantity
    else map.set(it.product.id, { ...it, quantity: it.quantity })
  }
  return [...map.values()]
}

export function CartSync() {
  const { user } = useAuth()
  const { items, replaceCart } = useCart()
  const loadedFor = useRef<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Al iniciar sesión: cargar + fusionar el carrito guardado.
  useEffect(() => {
    if (!user) { loadedFor.current = null; return }
    if (loadedFor.current === user.id) return
    loadedFor.current = user.id
    const supabase = getSupabaseBrowser()
    supabase
      .from("user_carts")
      .select("items")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: { data: { items: CartItem[] } | null }) => {
        const saved = Array.isArray(data?.items) ? (data!.items as CartItem[]) : []
        const merged = mergeCarts(saved, items)
        replaceCart(merged)
      })
  }, [user, items, replaceCart])

  // Guardar cambios del carrito en la cuenta (debounce).
  useEffect(() => {
    if (!user || loadedFor.current !== user.id) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      getSupabaseBrowser()
        .from("user_carts")
        .upsert({ user_id: user.id, items, updated_at: new Date().toISOString() })
        .then(() => {})
    }, 800)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [items, user])

  return null
}
