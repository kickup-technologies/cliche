"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Search, Heart, ShoppingCart, Star, SlidersHorizontal, X, Flame, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFavorites } from "@/context/favorites-context"
import { useCart } from "@/context/cart-context"
import { Header } from "@/components/header"
import { AnnouncementBar } from "@/components/announcement-bar"
import type { Product } from "@/lib/supabase"

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(price)
}

const CATEGORIES = [
  { label: "Todos", value: "all" },
  { label: "Hogar", value: "hogar" },
  { label: "Ropa y textiles", value: "ropa" },
  { label: "Kits de regalo", value: "kit" },
]

const SORT_OPTIONS = [
  { label: "Destacados", value: "featured" },
  { label: "Precio: menor a mayor", value: "price_asc" },
  { label: "Precio: mayor a menor", value: "price_desc" },
  { label: "Mejor valorados", value: "rating" },
  { label: "Nombre A–Z", value: "name" },
]

function categorize(slug: string): string {
  if (slug.startsWith("kit-")) return "kit"
  if (["aroma-vientos-de-lino", "aroma-frescura-de-lino", "aroma-calor-de-lana", "aroma-dulce-lana", "aroma-hilos-de-seda", "aroma-lycra-de-verano"].includes(slug)) return "ropa"
  return "hogar"
}

// ── Familias olfativas — curaduría editorial del catálogo ──
const FAMILIES = [
  { label: "Todas", value: "all" },
  { label: "Cítricos", value: "citricos" },
  { label: "Florales", value: "florales" },
  { label: "Amaderados", value: "amaderados" },
  { label: "Dulces", value: "dulces" },
  { label: "Frescos", value: "frescos" },
]

const FAMILY_MAP: Record<string, string> = {
  "dulce-lana": "citricos", "brillos-de-seda": "citricos", "agua": "citricos",
  "aire": "citricos", "frescura-de-lino": "citricos",
  "vientos-de-lino": "florales", "sello-de-dios": "florales", "lycra-de-verano": "florales",
  "tao": "florales", "romeo-y-julieta": "florales", "hilos-de-seda": "florales",
  "seda-del-lejano-oriente": "florales",
  "eternamente-indigo": "amaderados", "indigo-profundo": "amaderados",
  "luxury": "amaderados", "tierra": "amaderados",
  "calor-de-lana": "dulces", "mahai": "dulces", "coconut": "dulces", "watermelon": "dulces",
  "best-friends": "frescos", "air-fresh": "frescos",
}

function familyOf(slug: string): string {
  return FAMILY_MAP[slug.replace(/^aroma-/, "")] ?? "frescos"
}

// Session-stable views
const viewsMap = new Map<string, number>()
function getViews(id: string) {
  if (!viewsMap.has(id)) viewsMap.set(id, Math.floor(Math.random() * 38) + 9)
  return viewsMap.get(id)!
}

function ProductCard({ product }: { product: Product }) {
  const { toggleFavorite, isFavorite } = useFavorites()
  const { addItem, openDrawer } = useCart()
  const [added, setAdded] = useState(false)
  const fav = isFavorite(product.id)

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addItem(product)
    setAdded(true)
    setTimeout(() => { setAdded(false); openDrawer() }, 600)
  }

  const handleFav = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite(product)
  }

  return (
    <Link
      href={`/productos/${product.slug}`}
      className="group bg-white border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:border-primary/20 transition-all duration-300 block"
    >
      <div className="relative aspect-square bg-muted overflow-hidden">
        <Image
          src={product.image_url || "/images/placeholder.jpg"}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.badge && (
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold text-white ${product.badge_color}`}>
              {product.badge}
            </span>
          )}
          {product.stock > 0 && product.stock <= 3 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-600 text-white flex items-center gap-1 animate-pulse">
              <Flame className="w-3 h-3" />¡{product.stock === 1 ? "Última" : `Solo ${product.stock}`}!
            </span>
          )}
          {product.stock === 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-400 text-white">Agotado</span>
          )}
        </div>

        {/* Views */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 text-xs">
          <Eye className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground font-medium">{getViews(product.id)}</span>
        </div>

        {/* Favorite button */}
        <button
          onClick={handleFav}
          className="absolute bottom-3 right-3 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full shadow flex items-center justify-center hover:scale-110 transition-all"
          aria-label={fav ? "Quitar de favoritos" : "Guardar en favoritos"}
        >
          <Heart className={`w-4 h-4 transition-colors ${fav ? "fill-red-500 text-red-500" : "text-muted-foreground group-hover:text-red-400"}`} />
        </button>

        {/* Add to cart — hover overlay */}
        <div className="absolute inset-x-3 bottom-3 opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pr-12">
          <Button
            className="w-full rounded-full font-semibold text-sm"
            onClick={handleAdd}
            disabled={product.stock === 0}
          >
            {added ? "¡Agregado!" : <><ShoppingCart className="w-3.5 h-3.5 mr-1.5" />Al carrito</>}
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-1.5">
        <h3 className="font-semibold text-sm text-foreground leading-tight group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={`w-3 h-3 ${i < Math.floor(product.rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
          ))}
          <span className="text-xs text-muted-foreground ml-1">({product.reviews})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-foreground">{formatPrice(product.price)}</span>
          {product.original_price && (
            <span className="text-sm text-muted-foreground line-through">{formatPrice(product.original_price)}</span>
          )}
        </div>
      </div>
    </Link>
  )
}

function CatalogoInner() {
  const searchParams = useSearchParams()
  const initialCategory = searchParams.get("categoria") ?? "all"

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState(initialCategory)
  const [family, setFamily] = useState("all")
  const [sort, setSort] = useState("featured")
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => { setProducts(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let list = [...products]

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
      )
    }

    // Category
    if (category !== "all") {
      list = list.filter((p) => categorize(p.slug) === category)
    }

    // Familia olfativa
    if (family !== "all") {
      list = list.filter((p) => familyOf(p.slug) === family)
    }

    // Sort
    switch (sort) {
      case "price_asc":   list.sort((a, b) => a.price - b.price); break
      case "price_desc":  list.sort((a, b) => b.price - a.price); break
      case "rating":      list.sort((a, b) => b.rating - a.rating); break
      case "name":        list.sort((a, b) => a.name.localeCompare(b.name)); break
    }

    return list
  }, [products, search, category, family, sort])

  const clearFilters = () => { setSearch(""); setCategory("all"); setFamily("all"); setSort("featured") }
  const hasActiveFilters = search || category !== "all" || family !== "all" || sort !== "featured"

  return (
    <>
      <AnnouncementBar />
      <Header />
      <main className="min-h-screen bg-background pt-32 pb-20">
        <div className="container mx-auto max-w-7xl px-4">
          {/* Page header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-2">
              Catálogo completo
            </h1>
            <p className="text-muted-foreground">
              {loading ? "Cargando..." : `${products.length} aromas artesanales · Colombia`}
            </p>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar aroma..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[200px]"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* Filter toggle mobile */}
            <Button
              variant="outline"
              className="sm:hidden flex items-center gap-2 rounded-xl"
              onClick={() => setShowFilters((v) => !v)}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filtros
            </Button>
          </div>

          <div className="flex gap-6">
            {/* Sidebar filters — desktop always visible, mobile toggleable */}
            <aside className={`w-52 shrink-0 ${showFilters ? "block" : "hidden sm:block"}`}>
              <div className="bg-white border border-border rounded-2xl p-5 space-y-6 sticky top-28">
                <div>
                  <h3 className="font-semibold text-sm text-foreground mb-3">Categoría</h3>
                  <div className="space-y-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        onClick={() => setCategory(cat.value)}
                        className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                          category === cat.value
                            ? "bg-primary text-primary-foreground font-medium"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-sm text-foreground mb-3">Familia olfativa</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {FAMILIES.map((f) => (
                      <button
                        key={f.value}
                        onClick={() => setFamily(f.value)}
                        className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                          family === f.value
                            ? "border-primary bg-primary text-primary-foreground font-medium"
                            : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg py-2 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Limpiar filtros
                  </button>
                )}
              </div>
            </aside>

            {/* Products grid */}
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="bg-muted rounded-2xl aspect-square animate-pulse" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-muted-foreground text-lg mb-4">
                    No encontramos aromas con ese filtro.
                  </p>
                  <Button variant="outline" onClick={clearFilters} className="rounded-full">
                    Ver todos los aromas
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-4">
                    {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
                  </p>
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

export default function CatalogoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background animate-pulse" />}>
      <CatalogoInner />
    </Suspense>
  )
}
