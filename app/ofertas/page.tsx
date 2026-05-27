"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { ShoppingCart, Heart, ArrowLeft, Zap, Star, Truck, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { AnnouncementBar } from "@/components/announcement-bar"
import { useCart } from "@/context/cart-context"
import { useFavorites } from "@/context/favorites-context"
import type { Product } from "@/lib/supabase"

function formatPrice(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n)
}

function discountPct(price: number, original: number) {
  return Math.round((1 - price / original) * 100)
}

const BENEFIT_MAP: Record<string, string> = {
  "aroma-agua":              "Frescura de spa al instante. Ideal para sala, baño y cocina — la fragancia más versátil de la colección.",
  "aroma-aire":              "Ambiente limpio y renovado, como ventana abierta al campo. Elimina olores sin químicos agresivos.",
  "aroma-tierra":            "Calidez profunda y terrosa que da carácter a cualquier espacio. Madera, musgo y raíces colombianas.",
  "aroma-fuego":             "Intensidad especiada con notas de ámbar y canela. El favorito para cenas especiales y noches en casa.",
  "aroma-tao":               "Calma instantánea y enfoque mental. El aroma más pedido para home office y meditación.",
  "aroma-vientos-de-lino":   "Ropa y textiles oliendo a recién lavados durante todo el día. Fresco, limpio, irresistible.",
  "aroma-frescura-de-lino":  "El más versátil de la colección — limpieza discreta que combina con cualquier espacio.",
  "aroma-luxury":            "Experiencia oud árabe trasladada a tu hogar. Profundidad, misterio y elegancia en cada puf.",
  "aroma-crema":             "Dulzura cálida que hace que nadie quiera irse. Vainilla, tonka y sándalo en equilibrio perfecto.",
  "aroma-romeo-y-julieta":   "El ambiente ideal para noches especiales. Floral romántico con base amaderada y duradera.",
  "aroma-mahai":             "Alegría tropical que activa el buen humor al instante. El aroma que más sonrisas genera.",
  "aroma-calor-de-lana":     "Confort puro como una manta en invierno. Para cada regreso a casa que necesita sentirse como hogar.",
  "aroma-eternamente-indigo":"La fragancia que todos preguntan cuando entran. Floral profundo con carácter y presencia.",
  "aroma-best-friends":      "Energía frutal y alegre. El aroma de los domingos en casa y las mañanas perfectas.",
  "aroma-happiness":         "Optimismo en cada puf. Cítricos vivos que transforman el estado de ánimo en segundos.",
  "kit-armonia-x3":          "Los 3 aromas esenciales de Cliché en un solo kit. Ahorra $24.000 frente al precio individual.",
  "kit-elementos-x4":        "El ritual completo — Agua, Aire, Tierra y Fuego. Los 4 pilares de Cliché a precio especial.",
}

// ── Intersection-observer hook for entrance animation ─────────────────────
function useVisible(threshold = 0.2) {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

// ── Single product section ────────────────────────────────────────────────
function OfferRow({ product, index }: { product: Product; index: number }) {
  const reverse = index % 2 === 1          // even = image-left, odd = image-right
  const { addItem, openDrawer } = useCart()
  const { toggleFavorite, isFavorite } = useFavorites()
  const [added, setAdded] = useState(false)
  const { ref, visible } = useVisible(0.15)
  const fav = isFavorite(product.id)
  const pct = product.original_price ? discountPct(product.price, product.original_price) : 0
  const benefit = BENEFIT_MAP[product.slug] ?? "Aroma artesanal colombiano de alta permanencia."

  const handleAdd = () => {
    addItem(product)
    setAdded(true)
    setTimeout(() => { setAdded(false); openDrawer() }, 700)
  }

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className={`
        min-h-screen flex flex-col lg:flex-row items-stretch
        transition-all duration-700 ease-out
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}
        ${reverse ? "lg:flex-row-reverse" : ""}
      `}
    >
      {/* ── Image panel ── */}
      <div className="relative w-full lg:w-1/2 min-h-[50vh] lg:min-h-screen overflow-hidden bg-[#F5EDE9]">
        <Image
          src={product.image_url || "/images/placeholder.jpg"}
          alt={product.name}
          fill
          className="object-cover object-center transition-transform duration-700 hover:scale-105"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />

        {/* Discount badge — floating */}
        {pct > 0 && (
          <div className="absolute top-6 left-6 flex flex-col items-center justify-center w-20 h-20 rounded-full bg-[#C4958A] text-white shadow-xl">
            <span className="text-2xl font-black leading-none">-{pct}%</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest">OFF</span>
          </div>
        )}

        {/* Stock warning */}
        {product.stock > 0 && product.stock <= 5 && (
          <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-semibold text-orange-600 flex items-center gap-1.5 shadow">
            <Zap className="w-3.5 h-3.5 fill-orange-500" />
            Solo {product.stock} unidades disponibles
          </div>
        )}
      </div>

      {/* ── Text panel ── */}
      <div className="w-full lg:w-1/2 flex items-center bg-background">
        <div className="w-full max-w-lg mx-auto px-8 lg:px-16 py-16 lg:py-24 space-y-7">

          {/* Eyebrow */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 bg-[#FAF0EC] text-[#C4958A] text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
              <Zap className="w-3 h-3 fill-[#C4958A]" />
              Oferta limitada
            </span>
            {product.badge && (
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full text-white ${product.badge_color}`}>
                {product.badge}
              </span>
            )}
          </div>

          {/* Name */}
          <h2 className="text-4xl lg:text-5xl font-serif font-bold text-foreground leading-tight">
            {product.name}
          </h2>

          {/* Stars */}
          <div className="flex items-center gap-2">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">{product.rating.toFixed(1)} · {product.reviews} reseñas</span>
          </div>

          {/* Description */}
          <p className="text-lg text-muted-foreground leading-relaxed">
            {product.description || benefit}
          </p>

          {/* Benefit highlight */}
          <div className="border-l-4 border-[#C4958A] pl-4 text-sm text-foreground/70 italic leading-relaxed">
            {benefit}
          </div>

          {/* Price */}
          <div className="flex items-end gap-4">
            <span className="text-4xl font-black text-foreground">{formatPrice(product.price)}</span>
            {product.original_price && (
              <div className="flex flex-col pb-1">
                <span className="text-sm text-muted-foreground line-through">{formatPrice(product.original_price)}</span>
                <span className="text-sm font-bold text-[#C4958A]">Ahorras {formatPrice(product.original_price - product.price)}</span>
              </div>
            )}
          </div>

          {/* Trust pills */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-[#C4958A]" />Envío gratis +$300k</span>
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-[#C4958A]" />Garantía 30 días</span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button
              size="lg"
              className="flex-1 rounded-full font-semibold text-base py-6 bg-[#2D1A14] hover:bg-[#3D2A24]"
              onClick={handleAdd}
              disabled={product.stock === 0}
            >
              {product.stock === 0 ? "Agotado" : added ? "¡Agregado! ✓" : (
                <><ShoppingCart className="w-5 h-5 mr-2" />Agregar al carrito</>
              )}
            </Button>
            <button
              onClick={() => toggleFavorite(product)}
              className="w-14 h-14 rounded-full border border-border flex items-center justify-center hover:border-red-300 hover:bg-red-50 transition-colors"
              aria-label={fav ? "Quitar de favoritos" : "Guardar en favoritos"}
            >
              <Heart className={`w-5 h-5 transition-colors ${fav ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
            </button>
            <Link
              href={`/productos/${product.slug}`}
              className="w-14 h-14 rounded-full border border-border flex items-center justify-center hover:border-primary hover:text-primary transition-colors text-muted-foreground text-xs font-semibold text-center leading-tight"
              aria-label="Ver página del producto"
            >
              Ver más
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Divider between rows ──────────────────────────────────────────────────
function Divider({ index }: { index: number }) {
  const labels = ["", "Y también...", "Otro favorito", "No te lo pierdas", "Exclusivo por tiempo limitado"]
  const label = labels[index % labels.length]
  if (!label) return null
  return (
    <div className="flex items-center gap-6 px-8 py-6 bg-[#FAF8F5]">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-semibold">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────
export default function OfertasPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((all: Product[]) => {
        // Products with original_price are discounted
        setProducts(all.filter((p) => p.original_price && p.original_price > p.price))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <>
      <AnnouncementBar />
      <Header />

      {/* Hero strip */}
      <div className="pt-32 pb-16 bg-[#2D1A14] text-white text-center px-4">
        <div className="inline-flex items-center gap-2 bg-[#C4958A]/20 text-[#C4958A] text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest mb-6">
          <Zap className="w-3.5 h-3.5 fill-[#C4958A]" />
          Ofertas activas
        </div>
        <h1 className="text-4xl md:text-6xl font-serif font-bold mb-4">
          Precios que no duran
        </h1>
        <p className="text-white/60 text-lg max-w-xl mx-auto mb-8">
          Aromas seleccionados con descuento real — sin trampas, sin precio inflado.
        </p>
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-screen bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && products.length === 0 && (
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4 py-20">
          <Zap className="w-12 h-12 text-[#C4958A]/30 mb-4" />
          <h2 className="text-2xl font-serif font-semibold text-foreground mb-2">Sin ofertas activas ahora</h2>
          <p className="text-muted-foreground mb-8">Vuelve pronto — las ofertas se renuevan con frecuencia.</p>
          <Button asChild className="rounded-full px-8">
            <Link href="/catalogo">Ver catálogo completo</Link>
          </Button>
        </div>
      )}

      {/* Alternating product rows */}
      {!loading && products.map((product, i) => (
        <div key={product.id}>
          <Divider index={i} />
          <OfferRow product={product} index={i} />
        </div>
      ))}

      {/* Bottom CTA */}
      {!loading && products.length > 0 && (
        <div className="py-20 bg-[#FAF8F5] text-center px-4 border-t border-border">
          <p className="text-muted-foreground mb-4 text-sm">¿Buscas algo más?</p>
          <Button asChild variant="outline" className="rounded-full px-10 font-semibold">
            <Link href="/catalogo">Ver catálogo completo →</Link>
          </Button>
        </div>
      )}
    </>
  )
}
