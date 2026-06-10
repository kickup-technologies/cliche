"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useCart } from "@/context/cart-context"
import type { Product } from "@/lib/supabase"

/**
 * ProductCollection — grid de productos minimal editorial (estilo renesme).
 * Card: imagen vertical que cambia a la 2ª foto en hover, nombre + precio
 * centrados, y "Añadir a la cesta" que aparece en hover. Reutiliza /api/products.
 */
function formatPrice(price: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(price)
}

interface ProductCollectionProps {
  eyebrow?: string
  title: string
  /** límite de productos a mostrar */
  limit?: number
  ctaHref?: string
  ctaLabel?: string
}

export function ProductCollection({
  eyebrow = "Recién llegados",
  title = "Nuestros aromas",
  limit = 8,
  ctaHref = "/catalogo",
  ctaLabel = "Ver todos los aromas",
}: ProductCollectionProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const { addItem, openDrawer } = useCart()

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProducts(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleAdd = (e: React.MouseEvent, product: Product) => {
    e.preventDefault()
    e.stopPropagation()
    addItem(product)
    openDrawer()
  }

  const shown = products.slice(0, limit)

  return (
    <section id="productos" className="bg-background py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          {eyebrow && (
            <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary">
              {eyebrow}
            </p>
          )}
          <h2 className="font-serif text-3xl font-medium text-foreground md:text-4xl">{title}</h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[3/4] w-full bg-secondary" />
                <div className="mx-auto mt-4 h-3 w-2/3 bg-secondary" />
                <div className="mx-auto mt-2 h-3 w-1/3 bg-secondary" />
              </div>
            ))}
          </div>
        ) : shown.length === 0 ? (
          <p className="text-center text-muted-foreground">
            Pronto cargaremos nuestros aromas aquí.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4">
            {shown.map((product) => {
              const secondImg = product.image_urls?.[1]
              return (
                <Link
                  key={product.id}
                  href={`/productos/${product.slug}`}
                  className="group block text-center"
                >
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-secondary">
                    <Image
                      src={product.image_url || "/images/placeholder.jpg"}
                      alt={product.name}
                      fill
                      sizes="(max-width: 1024px) 50vw, 25vw"
                      className={`object-cover transition-opacity duration-500 ${
                        secondImg ? "group-hover:opacity-0" : "group-hover:scale-105"
                      }`}
                    />
                    {secondImg && (
                      <Image
                        src={secondImg}
                        alt={product.name}
                        fill
                        sizes="(max-width: 1024px) 50vw, 25vw"
                        className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                      />
                    )}

                    {product.badge && (
                      <span className="absolute left-3 top-3 bg-white/95 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-foreground">
                        {product.badge}
                      </span>
                    )}

                    {/* Añadir a la cesta — aparece en hover */}
                    <button
                      onClick={(e) => handleAdd(e, product)}
                      disabled={product.stock === 0}
                      className="absolute inset-x-3 bottom-3 translate-y-3 bg-foreground py-3 text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-background opacity-0 transition-all duration-300 hover:bg-primary group-hover:translate-y-0 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {product.stock === 0 ? "Agotado" : "Añadir a la cesta"}
                    </button>
                  </div>

                  <h3 className="mt-4 font-serif text-lg font-medium text-foreground">
                    {product.name}
                  </h3>
                  <div className="mt-1 flex items-center justify-center gap-2">
                    <span className="text-sm text-foreground">{formatPrice(product.price)}</span>
                    {product.original_price && product.original_price > product.price && (
                      <span className="text-xs text-muted-foreground line-through">
                        {formatPrice(product.original_price)}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {ctaHref && (
          <div className="mt-14 text-center">
            <Link
              href={ctaHref}
              className="inline-flex items-center justify-center border border-foreground px-9 py-3.5 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              {ctaLabel}
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
