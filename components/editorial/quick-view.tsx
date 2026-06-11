"use client"

import { useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { X } from "lucide-react"
import { useCart } from "@/context/cart-context"
import { getCatalogProduct } from "@/lib/catalog-data"
import type { Product } from "@/lib/supabase"

interface QuickViewProps {
  product: Product | null
  onClose: () => void
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(price)
}

/**
 * QuickView — modal de vista rápida (ref: Net-a-Porter, Byredo).
 * Foto grande + notas olfativas + precio + CTA sin salir del catálogo.
 */
export function QuickView({ product, onClose }: QuickViewProps) {
  const { addItem, openDrawer } = useCart()

  useEffect(() => {
    if (!product) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [product, onClose])

  if (!product) return null

  const catalogItem = getCatalogProduct(product.slug)

  const handleAdd = () => {
    addItem(product)
    onClose()
    openDrawer()
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Vista rápida: ${product.name}`}
    >
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* panel */}
      <div className="relative z-10 grid w-full max-w-3xl animate-in fade-in zoom-in-95 duration-300 grid-cols-1 overflow-hidden bg-background shadow-2xl md:grid-cols-2">
        <button
          onClick={onClose}
          aria-label="Cerrar vista rápida"
          className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground transition-colors hover:bg-foreground hover:text-background"
        >
          <X className="h-4 w-4" />
        </button>

        {/* foto */}
        <div className="relative aspect-[3/4] bg-secondary md:aspect-auto md:min-h-[480px]">
          <Image
            src={product.image_url || "/images/placeholder.jpg"}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>

        {/* info */}
        <div className="flex flex-col justify-center gap-5 p-8 md:p-10">
          {catalogItem?.tagline && (
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-primary">
              {catalogItem.tagline}
            </p>
          )}
          <h2 className="font-serif text-3xl font-medium text-foreground">{product.name}</h2>
          <p className="text-lg text-foreground">{formatPrice(product.price)}</p>

          {catalogItem?.notes && catalogItem.notes.length > 0 && (
            <div>
              <p className="mb-2 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Notas olfativas
              </p>
              <div className="flex flex-wrap gap-1.5">
                {catalogItem.notes.map((n) => (
                  <span
                    key={n}
                    className="border border-border bg-secondary/50 px-2.5 py-1 text-xs text-foreground"
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          )}

          {product.description && (
            <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          )}

          <div className="mt-1 flex flex-col gap-2.5">
            <button
              onClick={handleAdd}
              disabled={product.stock === 0}
              className="w-full bg-foreground py-3.5 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-background transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {product.stock === 0 ? "Agotado" : "Añadir a la cesta"}
            </button>
            <Link
              href={`/productos/${product.slug}`}
              className="link-underline self-center text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-foreground"
            >
              Ver detalles completos
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
