"use client"

import { useEffect, useRef } from "react"
import { useAuth } from "@/context/auth-context"
import { useCart, type CartItem } from "@/context/cart-context"
import { getSupabaseBrowser } from "@/lib/supabase/client"

/**
 * Sincroniza el carrito con la cuenta (tabla user_carts, aislada por RLS).
 *
 * Reglas para EVITAR cruce de datos entre usuarios en el mismo navegador:
 *  - Se guarda el "dueño" del carrito local (`cliche-cart-owner`): "guest" o el id.
 *  - Al iniciar sesión:
 *      · si el carrito local era de INVITADO → se FUSIONA con el guardado (traer
 *        lo que el invitado agregó antes de loguearse).
 *      · si era de OTRO usuario (o del mismo) → se REEMPLAZA por el del servidor
 *        (sin contaminar y sin duplicar cantidades).
 *  - Al cerrar sesión → se LIMPIA el carrito local (no queda para el siguiente).
 */
const OWNER_KEY = "cliche-cart-owner"

function mergeCarts(server: CartItem[], local: CartItem[]): CartItem[] {
  const map = new Map<string, CartItem>()
  for (const it of [...server, ...local]) {
    const existing = map.get(it.product.id)
    if (existing) existing.quantity += it.quantity
    else map.set(it.product.id, { ...it, quantity: it.quantity })
  }
  return [...map.values()]
}

export function CartSync() {
  const { user } = useAuth()
  const { items, replaceCart, clearCart, hydrated } = useCart()
  const itemsRef = useRef(items)
  itemsRef.current = items
  const loadedFor = useRef<string | null>(null)
  const prevUser = useRef<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Esperar a que el carrito local esté hidratado para no fusionar con [] vacío.
    if (!hydrated) return
    const uid = user?.id ?? null

    // ── Cierre de sesión: limpiar el carrito local para no heredarlo a otro ──
    if (!uid) {
      if (prevUser.current) {
        clearCart()
        try { localStorage.setItem(OWNER_KEY, "guest") } catch {}
      }
      prevUser.current = null
      loadedFor.current = null
      return
    }

    prevUser.current = uid
    if (loadedFor.current === uid) return
    loadedFor.current = uid

    getSupabaseBrowser()
      .from("user_carts")
      .select("items")
      .eq("user_id", uid)
      .maybeSingle()
      .then(({ data }: { data: { items: CartItem[] } | null }) => {
        const server = Array.isArray(data?.items) ? (data!.items as CartItem[]) : []
        const local = itemsRef.current
        let owner: string | null = null
        try { owner = localStorage.getItem(OWNER_KEY) } catch {}
        let next: CartItem[]
        if (owner === uid) {
          // Recarga del MISMO usuario: el servidor manda (evita doble conteo);
          // si el servidor está vacío, conservamos el local (recuperación).
          next = server.length ? server : local
        } else if (owner === "guest" || owner === null) {
          // Invitado → cuenta: traemos lo que el invitado había agregado.
          next = mergeCarts(server, local)
        } else {
          // Carrito que pertenecía a OTRO usuario: usar solo el del servidor (no cruzar).
          next = server
        }
        replaceCart(next)
        try { localStorage.setItem(OWNER_KEY, uid) } catch {}
      })
  }, [user, hydrated, replaceCart, clearCart])

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
