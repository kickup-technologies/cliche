"use client"

import { useState } from "react"
import { ShoppingBag, Check } from "lucide-react"
import { useCart } from "@/context/cart-context"
import type { Product } from "@/lib/supabase"

/**
 * Botón de "agregado rápido al carrito" para tarjetas de producto.
 * Reutilizable en cualquier grid (catálogo, landings de pauta): agrega 1 unidad
 * sin salir de la página y abre el drawer del carrito como confirmación.
 * Siempre visible en móvil (donde no existe hover) — el 90%+ del tráfico de
 * pauta llega desde Instagram en celular.
 */
export function QuickAddButton({ product, className = "" }: { product: Product; className?: string }) {
  const { addItem, openDrawer } = useCart()
  const [added, setAdded] = useState(false)
  const soldOut = product.stock === 0

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (soldOut || added) return
    addItem(product)
    setAdded(true)
    setTimeout(() => { setAdded(false); openDrawer() }, 650)
  }

  return (
    <button
      onClick={handleAdd}
      disabled={soldOut}
      aria-label={soldOut ? `${product.name} agotado` : `Agregar ${product.name} al carrito`}
      className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white shadow-lg transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${added ? "bg-[#A67163]" : "bg-[#2D1A14] hover:bg-[#A67163]"} ${className}`}
    >
      {soldOut ? "Agotado" : added ? (<><Check className="h-3.5 w-3.5" /> ¡Agregado!</>) : (<><ShoppingBag className="h-3.5 w-3.5" /> Agregar al carrito</>)}
    </button>
  )
}
