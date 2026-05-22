"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Star, ShoppingCart, Eye, Flame } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useCart } from "@/context/cart-context"
import type { Product } from "@/lib/supabase"

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(price)
}

export function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [isVisible, setIsVisible] = useState(false)
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null)
  const [addedToCart, setAddedToCart] = useState<string | null>(null)
  const sectionRef = useRef<HTMLDivElement>(null)
  const { addItem } = useCart()

  // Cargar productos reales desde Supabase via API
  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then(setProducts)
      .catch(console.error)
  }, [])

  // Animación de entrada
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true) },
      { threshold: 0.1 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  const handleAddToCart = (product: Product) => {
    addItem(product)
    setAddedToCart(product.id)
    setTimeout(() => setAddedToCart(null), 2000)
  }

  return (
    <section ref={sectionRef} className="py-16 px-4 bg-background">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            Productos Destacados
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Los favoritos de nuestra comunidad, cuidadosamente seleccionados para tu bienestar.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product, index) => (
            <div
              key={product.id}
              className={cn(
                "group bg-white border border-border rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-xl hover:border-primary/20",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}
              style={{ transitionDelay: `${index * 100}ms` }}
              onMouseEnter={() => setHoveredProduct(product.id)}
              onMouseLeave={() => setHoveredProduct(null)}
            >
              <div className="relative aspect-square bg-muted overflow-hidden">
                <Image
                  src={product.image_url || "/images/placeholder.jpg"}
                  alt={product.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                  {product.badge && (
                    <span className={cn("px-3 py-1 rounded-full text-xs font-semibold text-white", product.badge_color)}>
                      {product.badge}
                    </span>
                  )}
                  {product.stock > 0 && product.stock <= 5 && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-destructive text-destructive-foreground flex items-center gap-1">
                      <Flame className="w-3 h-3" />
                      ¡Solo {product.stock} disponibles!
                    </span>
                  )}
                  {product.stock === 0 && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-400 text-white">
                      Agotado
                    </span>
                  )}
                </div>
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 text-xs">
                  <Eye className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{Math.floor(product.stock * 1.8 + 3)}</span>
                </div>
                <div className={cn(
                  "absolute inset-x-3 bottom-3 transition-all duration-300",
                  hoveredProduct === product.id ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                )}>
                  <Button
                    className="w-full rounded-full font-semibold"
                    onClick={() => handleAddToCart(product)}
                    disabled={product.stock === 0}
                  >
                    {addedToCart === product.id ? "¡Agregado! ✓" : (
                      <><ShoppingCart className="w-4 h-4 mr-2" />Agregar al carrito</>
                    )}
                  </Button>
                </div>
              </div>

              <div className="p-4 space-y-2">
                <h3 className="font-semibold text-foreground text-sm leading-tight">{product.name}</h3>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={cn("w-3.5 h-3.5",
                      i < Math.floor(product.rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                    )} />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">({product.reviews})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-foreground">{formatPrice(product.price)}</span>
                  {product.original_price && (
                    <span className="text-sm text-muted-foreground line-through">{formatPrice(product.original_price)}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {addedToCart && (
        <div className="fixed bottom-20 md:bottom-6 right-6 bg-foreground text-background px-4 py-3 rounded-xl shadow-lg z-50 animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            <span className="font-medium">Producto agregado al carrito</span>
          </div>
        </div>
      )}
    </section>
  )
}
