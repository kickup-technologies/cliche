"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Heart, ShoppingCart, Star, ArrowLeft, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFavorites } from "@/context/favorites-context"
import { useCart } from "@/context/cart-context"
import { Header } from "@/components/header"
import { AnnouncementBar } from "@/components/announcement-bar"
import type { Product } from "@/lib/supabase"
import { PRODUCT_PLACEHOLDER } from "@/lib/placeholder"

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(price)
}

function FavoriteCard({ product }: { product: Product }) {
  const { toggleFavorite } = useFavorites()
  const { addItem, openDrawer } = useCart()
  const [added, setAdded] = useState(false)

  const handleAdd = () => {
    addItem(product)
    setAdded(true)
    setTimeout(() => { setAdded(false); openDrawer() }, 600)
  }

  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden group hover:shadow-xl hover:border-primary/20 transition-all duration-300">
      <div className="relative aspect-square bg-muted overflow-hidden">
        <Link href={`/productos/${product.slug}`}>
          <Image
            src={product.image_url || PRODUCT_PLACEHOLDER}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </Link>
        {product.badge && (
          <span className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold text-white ${product.badge_color}`}>
            {product.badge}
          </span>
        )}
        {/* Remove from favorites */}
        <button
          onClick={() => toggleFavorite(product)}
          className="absolute top-3 right-3 w-9 h-9 bg-white rounded-full shadow-md flex items-center justify-center hover:scale-110 transition-transform"
          aria-label="Quitar de favoritos"
        >
          <Heart className="w-4 h-4 fill-red-500 text-red-500" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        <Link href={`/productos/${product.slug}`}>
          <h3 className="font-semibold text-foreground leading-tight hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(product.rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
          ))}
          <span className="text-xs text-muted-foreground ml-1">({product.reviews})</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-foreground">{formatPrice(product.price)}</span>
          {product.original_price && (
            <span className="text-sm text-muted-foreground line-through">{formatPrice(product.original_price)}</span>
          )}
        </div>

        <Button
          className="w-full rounded-full font-semibold"
          onClick={handleAdd}
          disabled={product.stock === 0}
        >
          {added ? "¡Agregado!" : (
            <><ShoppingCart className="w-4 h-4 mr-2" />{product.stock === 0 ? "Agotado" : "Agregar al carrito"}</>
          )}
        </Button>
      </div>
    </div>
  )
}

export default function FavoritosPage() {
  const { products } = useFavorites()

  return (
    <>
      <AnnouncementBar />
      <Header />
      <main className="min-h-screen bg-background pt-32 pb-20">
        <div className="container mx-auto max-w-6xl px-4">
          {/* Header */}
          <div className="mb-10">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al inicio
            </Link>
            <div className="flex items-center gap-3">
              <Heart className="w-7 h-7 fill-red-500 text-red-500" />
              <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
                Mis Favoritos
              </h1>
              {products.length > 0 && (
                <span className="bg-primary/10 text-primary text-sm font-semibold px-3 py-1 rounded-full">
                  {products.length} {products.length === 1 ? "producto" : "productos"}
                </span>
              )}
            </div>
          </div>

          {/* Empty state */}
          {products.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-24 h-24 bg-[#FAF3F1] rounded-full flex items-center justify-center mb-6">
                <Heart className="w-12 h-12 text-[#C4958A]/40" />
              </div>
              <h2 className="text-xl font-serif font-semibold text-foreground mb-2">
                Aún no tienes favoritos
              </h2>
              <p className="text-muted-foreground mb-8 max-w-sm">
                Toca el corazón en cualquier producto para guardarlo aquí y encontrarlo fácil después.
              </p>
              <Button asChild size="lg" className="rounded-full px-8 font-semibold">
                <Link href="/catalogo">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Explorar catálogo
                </Link>
              </Button>
            </div>
          )}

          {/* Products grid */}
          {products.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <FavoriteCard key={product.id} product={product} />
                ))}
              </div>
              <div className="mt-12 text-center">
                <Link
                  href="/catalogo"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
                >
                  Seguir explorando el catálogo →
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  )
}
