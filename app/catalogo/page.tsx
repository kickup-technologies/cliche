"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Search, X, Eye } from "lucide-react"
import { useCart } from "@/context/cart-context"
import { Header } from "@/components/header"
import { AnnouncementBar } from "@/components/announcement-bar"
import { Footer } from "@/components/footer"
import { SplitText } from "@/components/editorial/split-text"
import { QuickView } from "@/components/editorial/quick-view"
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
]

const SORT_OPTIONS = [
  { label: "Destacados", value: "featured" },
  { label: "Precio: menor a mayor", value: "price_asc" },
  { label: "Precio: mayor a menor", value: "price_desc" },
  { label: "Mejor valorados", value: "rating" },
  { label: "Nombre A–Z", value: "name" },
]

// Los slugs reales del API no llevan prefijo "aroma-"
const ROPA_SLUGS = new Set([
  "vientos-de-lino", "frescura-de-lino", "calor-de-lana",
  "dulce-lana", "hilos-de-seda", "lycra-de-verano",
])

function categorize(slug: string): string {
  return ROPA_SLUGS.has(slug.replace(/^aroma-/, "")) ? "ropa" : "hogar"
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

function ProductCard({
  product,
  index,
  onQuickView,
}: {
  product: Product
  index: number
  onQuickView: (p: Product) => void
}) {
  const { addItem, openDrawer } = useCart()
  const [added, setAdded] = useState(false)
  const secondImg = product.image_urls?.[1]

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addItem(product)
    // micro-feedback en el botón antes de abrir el carrito
    setAdded(true)
    setTimeout(() => {
      setAdded(false)
      openDrawer()
    }, 650)
  }

  return (
    <Link
      href={`/productos/${product.slug}`}
      className="catalog-card group block text-center"
      style={{ animationDelay: `${Math.min(index, 11) * 60}ms` }}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-secondary">
        <Image
          src={product.image_url || "/images/placeholder.jpg"}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
          className={`object-cover transition-all duration-700 ${
            secondImg ? "group-hover:opacity-0" : "group-hover:scale-105"
          }`}
        />
        {secondImg && (
          <Image
            src={secondImg}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100"
          />
        )}

        {/* Badges editoriales */}
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {product.badge && (
            <span className="bg-white/95 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-foreground">
              {product.badge}
            </span>
          )}
          {product.stock > 0 && product.stock <= 3 && (
            <span className="bg-foreground/90 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-background">
              Últimas unidades
            </span>
          )}
          {product.stock === 0 && (
            <span className="bg-foreground/60 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-background">
              Agotado
            </span>
          )}
        </div>

        {/* Vista rápida */}
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onQuickView(product)
          }}
          aria-label={`Vista rápida de ${product.name}`}
          className="absolute right-3 top-3 flex h-9 w-9 -translate-y-1 items-center justify-center rounded-full bg-white/95 text-foreground opacity-0 shadow-sm transition-all duration-300 hover:bg-foreground hover:text-background group-hover:translate-y-0 group-hover:opacity-100"
        >
          <Eye className="h-4 w-4" />
        </button>

        {/* Añadir a la cesta */}
        <button
          onClick={handleAdd}
          disabled={product.stock === 0}
          className={`absolute inset-x-3 bottom-3 translate-y-3 py-3 text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-background opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-50 ${
            added ? "bg-primary" : "bg-foreground hover:bg-primary"
          }`}
        >
          {product.stock === 0 ? "Agotado" : added ? "Agregado ✓" : "Añadir a la cesta"}
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
  const [quickView, setQuickView] = useState<Product | null>(null)

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => { setProducts(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let list = [...products]

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
      )
    }

    if (category !== "all") {
      list = list.filter((p) => categorize(p.slug) === category)
    }

    if (family !== "all") {
      list = list.filter((p) => familyOf(p.slug) === family)
    }

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
      <main className="min-h-screen bg-background pb-24 pt-32">
        {/* ── Cabecera editorial asimétrica ── */}
        <header className="container mx-auto flex flex-wrap items-end justify-between gap-x-10 gap-y-4 px-4 pb-12 pt-6 md:pb-16">
          <div>
            <p className="mb-4 text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-primary">
              La colección
            </p>
            <SplitText
              text="Todos nuestros aromas"
              as="h1"
              className="font-serif text-4xl font-medium leading-tight text-foreground md:text-6xl"
            />
          </div>
          <p className="mb-2 text-sm font-light tracking-wide text-muted-foreground">
            {loading ? "Curando la colección…" : `${products.length} aromas artesanales · hechos en Colombia`}
          </p>
        </header>

        {/* ── Barra de filtros editorial ── */}
        <div className="sticky top-20 z-30 border-y border-border/70 bg-background/90 backdrop-blur-md">
          <div className="container mx-auto flex flex-col gap-0 px-4">
            {/* Fila 1: categorías + buscar + ordenar */}
            <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2 py-3.5">
              <nav className="flex flex-wrap items-center gap-x-7 gap-y-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={`relative py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-left after:scale-x-0 after:bg-foreground after:transition-transform after:duration-300 hover:text-foreground ${
                      category === cat.value
                        ? "text-foreground after:scale-x-100"
                        : "text-muted-foreground"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </nav>

              <div className="flex flex-1 items-center justify-end gap-6">
                {/* Buscar — línea minimal */}
                <div className="relative w-full max-w-[220px]">
                  <Search className="pointer-events-none absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar aroma"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full border-b border-border bg-transparent py-1.5 pl-6 pr-6 text-xs tracking-wide text-foreground placeholder:text-muted-foreground/70 focus:border-foreground focus:outline-none"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Ordenar — select sin caja */}
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="cursor-pointer appearance-none border-b border-transparent bg-transparent py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-foreground hover:border-border focus:outline-none"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fila 2: familias olfativas */}
            <div className="flex flex-wrap items-center gap-2 border-t border-border/50 py-3">
              <span className="mr-2 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Familia olfativa
              </span>
              {FAMILIES.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFamily(f.value)}
                  className={`rounded-full border px-3.5 py-1 text-[0.66rem] font-medium uppercase tracking-[0.12em] transition-colors ${
                    family === f.value
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="ml-auto flex items-center gap-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                >
                  <X className="h-3 w-3" />
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Grid de productos ── */}
        <div className="container mx-auto px-4 pt-12">
          {loading ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[3/4] w-full bg-secondary" />
                  <div className="mx-auto mt-4 h-3 w-2/3 bg-secondary" />
                  <div className="mx-auto mt-2 h-3 w-1/3 bg-secondary" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-24 text-center">
              <p className="font-serif text-2xl font-medium text-foreground">
                No encontramos aromas con ese filtro
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Prueba con otra búsqueda o explora la colección completa.
              </p>
              <button
                onClick={clearFilters}
                className="mt-8 inline-flex items-center justify-center border border-foreground px-9 py-3.5 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-foreground transition-colors hover:bg-foreground hover:text-background"
              >
                Ver todos los aromas
              </button>
            </div>
          ) : (
            <>
              <p className="mb-8 text-center text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
              </p>
              <div
                key={`${category}-${family}-${sort}-${search}`}
                className="grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-3 xl:grid-cols-4"
              >
                {filtered.map((product, i) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={i}
                    onQuickView={setQuickView}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />

      <QuickView product={quickView} onClose={() => setQuickView(null)} />

      <style jsx global>{`
        .catalog-card {
          opacity: 0;
          transform: translateY(28px);
          animation: catalog-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes catalog-rise {
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .catalog-card { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
    </>
  )
}

export default function CatalogoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen animate-pulse bg-background" />}>
      <CatalogoInner />
    </Suspense>
  )
}
