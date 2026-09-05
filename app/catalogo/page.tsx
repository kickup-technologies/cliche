"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { SEGMENT_LABEL, SEGMENTS, segmentsForSlug } from "@/lib/segments"
import { PRICE_TIERS } from "@/lib/pricing"
import Image from "next/image"
import Link from "next/link"
import { Eye, ArrowUp, ChevronDown, LayoutGrid } from "lucide-react"
import { useCart } from "@/context/cart-context"
import { Header } from "@/components/header"
import { AnnouncementBar } from "@/components/announcement-bar"
import { Footer } from "@/components/footer"
import { SplitText } from "@/components/editorial/split-text"
import { QuickView } from "@/components/editorial/quick-view"
import type { Product } from "@/lib/supabase"
import { PRODUCT_PLACEHOLDER } from "@/lib/placeholder"

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(price)
}

const ROPA_SLUGS = new Set([
  "vientos-de-lino", "frescura-de-lino", "calor-de-lana",
  "dulce-lana", "hilos-de-seda", "lycra-de-verano",
])

function categorize(slug: string): string {
  return ROPA_SLUGS.has(slug.replace(/^aroma-/, "")) ? "ropa" : "hogar"
}

// ── Familias olfativas: el catálogo se ordena y narra por familia ──
const FAMILIES = [
  { value: "citricos", label: "Cítricos", tag: "Frescos y luminosos. Energía que despierta el ambiente." },
  { value: "florales", label: "Florales", tag: "Delicados y sofisticados. Una firma elegante." },
  { value: "amaderados", label: "Amaderados", tag: "Cálidos y envolventes, con carácter y profundidad." },
  { value: "dulces", label: "Dulces", tag: "Acogedores y reconfortantes. Sensación de hogar." },
  { value: "frescos", label: "Frescos", tag: "Limpios y aireados. Sensación de recién lavado." },
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

// La familia (categoría) la elige el admin en el panel (product.category).
// Si no está asignada, se cae al mapeo histórico por slug para no romper los
// productos existentes.
function familyOf(p: { slug: string; category?: string | null }): string {
  if (p.category && FAMILIES.some((f) => f.value === p.category)) return p.category
  return FAMILY_MAP[p.slug.replace(/^aroma-/, "")] ?? "frescos"
}

/* ───────────────────────── Tarjeta de producto ───────────────────────── */
function ProductCard({ product, onQuickView }: { product: Product; onQuickView: (p: Product) => void }) {
  const { addItem, openDrawer } = useCart()
  const [added, setAdded] = useState(false)
  const secondImg = product.image_urls?.[1]
  const soldOut = product.stock === 0

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (soldOut) return
    addItem(product)
    setAdded(true)
    setTimeout(() => { setAdded(false); openDrawer() }, 650)
  }

  return (
    <Link href={`/productos/${product.slug}`} className="group flex flex-col">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-border/40 bg-secondary/40 transition-all duration-500 group-hover:-translate-y-1 group-hover:border-border group-hover:shadow-[0_22px_50px_-28px_rgba(45,26,20,0.45)]">
        <Image
          src={product.image_url || PRODUCT_PLACEHOLDER}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
          className={`object-cover transition-all duration-700 ${secondImg ? "group-hover:opacity-0" : "group-hover:scale-[1.04]"}`}
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

        <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
          {product.badge && (
            <span className="rounded-full bg-foreground px-2.5 py-1 text-[0.55rem] font-semibold uppercase tracking-[0.16em] text-background shadow-sm">{product.badge}</span>
          )}
          {soldOut && (
            <span className="rounded-full bg-foreground/55 px-2.5 py-1 text-[0.55rem] font-semibold uppercase tracking-[0.16em] text-background">Agotado</span>
          )}
        </div>

        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onQuickView(product) }}
          aria-label={`Vista rápida de ${product.name}`}
          className="absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground opacity-0 shadow-sm backdrop-blur-sm transition-all duration-300 hover:bg-foreground hover:text-background group-hover:opacity-100 focus-visible:opacity-100"
        >
          <Eye className="h-4 w-4" />
        </button>

        <button
          onClick={handleAdd}
          disabled={soldOut}
          className={`absolute inset-x-2.5 bottom-2.5 rounded-lg py-2.5 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-background shadow-lg transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 sm:translate-y-3 sm:py-3 sm:text-[0.66rem] sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 ${added ? "bg-primary" : "bg-foreground hover:bg-primary"}`}
        >
          {soldOut ? "Agotado" : added ? "Agregado ✓" : "Añadir a la cesta"}
        </button>
      </div>

      <h3 className="mt-3 font-serif text-[0.95rem] font-medium leading-snug text-foreground transition-colors group-hover:text-primary sm:text-[1.05rem]">{product.name}</h3>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-sm font-semibold text-foreground">{formatPrice(product.price)}</span>
        <span className="text-[0.7rem] font-medium text-muted-foreground">/und</span>
        {product.original_price && product.original_price > product.price && (
          <span className="text-xs text-muted-foreground line-through">{formatPrice(product.original_price)}</span>
        )}
      </div>
      {/* Kits del mismo aroma (precios fijos por tier). El producto de prueba
          no ofrece kits. */}
      {product.slug !== "prueba" && (
        <p className="mt-1 text-[0.68rem] leading-relaxed text-muted-foreground/80">
          {PRICE_TIERS.filter((t) => t.units > 1)
            .map((t) => `x${t.units} $${t.price.toLocaleString("es-CO")}`)
            .join("  ·  ")}
        </p>
      )}
    </Link>
  )
}

/* ───────────────── Sección por familia (reveal al entrar) ───────────────── */
function FamilySection({
  index, label, tag, products, onQuickView,
}: {
  index: number; label: string; tag: string; products: Product[]; onQuickView: (p: Product) => void
}) {
  const ref = useRef<HTMLElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setInView(true); return }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect() } },
      { threshold: 0.08, rootMargin: "0px 0px -8% 0px" },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  if (!products.length) return null

  return (
    <section ref={ref} className="scroll-mt-36">
      <div className="mb-8 flex items-end justify-between gap-6 border-b border-border/60 pb-5">
        <div>
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-primary">
            Familia {String(index + 1).padStart(2, "0")}
          </p>
          <h2 className="mt-2 font-serif text-2xl font-medium text-foreground md:text-4xl">{label}</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{tag}</p>
        </div>
        <span className="hidden whitespace-nowrap text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:block">
          {products.length} {products.length === 1 ? "aroma" : "aromas"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
        {products.map((p, i) => (
          <div
            key={p.id}
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "none" : "translateY(26px)",
              transition: `opacity 0.7s cubic-bezier(0.22,1,0.36,1) ${Math.min(i, 7) * 70}ms, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${Math.min(i, 7) * 70}ms`,
            }}
          >
            <ProductCard product={p} onQuickView={onQuickView} />
          </div>
        ))}
      </div>
    </section>
  )
}

/* ─────────────────────────────── Página ─────────────────────────────── */
function CatalogoInner() {
  const searchParams = useSearchParams()
  const initialCategory = searchParams.get("categoria") ?? "all"
  const initialSegment = searchParams.get("segmento") ?? "all"

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [category] = useState(initialCategory)
  const [family, setFamily] = useState("all")
  const [segment, setSegment] = useState(initialSegment)
  const [catOpen, setCatOpen] = useState(false)
  const [quickView, setQuickView] = useState<Product | null>(null)
  const [showTop, setShowTop] = useState(false)

  const progressRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const catMenuRef = useRef<HTMLDivElement>(null)

  // Cerrar el menú de categorías al hacer clic fuera.
  useEffect(() => {
    if (!catOpen) return
    const onDown = (e: MouseEvent) => {
      if (catMenuRef.current && !catMenuRef.current.contains(e.target as Node)) setCatOpen(false)
    }
    window.addEventListener("mousedown", onDown)
    return () => window.removeEventListener("mousedown", onDown)
  }, [catOpen])

  // Elegir una categoría (segmento): filtra + baja suave al contenido para que
  // se vea la reorganización animada de los aromas.
  function pickSegment(key: string) {
    setSegment(key)
    setFamily("all")
    setCatOpen(false)
    requestAnimationFrame(() => {
      const el = contentRef.current
      if (!el) return
      const y = el.getBoundingClientRect().top + window.scrollY - 130
      const lenis = (window as unknown as { __lenis?: { scrollTo: (t: number, o?: object) => void } }).__lenis
      if (lenis?.scrollTo) lenis.scrollTo(y, { duration: 1 })
      else window.scrollTo({ top: y, behavior: "smooth" })
    })
  }

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => { setProducts(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Barra de progreso + botón volver-arriba (rAF, compatible con Lenis)
  useEffect(() => {
    let raf = 0
    let visible = false
    const tick = () => {
      const lenis = (window as unknown as { __lenis?: { scroll: number } }).__lenis
      const y = lenis?.scroll ?? window.scrollY
      const max = document.documentElement.scrollHeight - window.innerHeight
      const p = max > 0 ? Math.min(1, y / max) : 0
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${p})`
      const shouldShow = y > 700
      if (shouldShow !== visible) { visible = shouldShow; setShowTop(shouldShow) }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const scrollTop = () => {
    const lenis = (window as unknown as { __lenis?: { scrollTo: (t: number, o?: object) => void } }).__lenis
    if (lenis?.scrollTo) lenis.scrollTo(0, { duration: 1.1 })
    else window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const byCategory = category === "all" ? products : products.filter((p) => categorize(p.slug) === category)
  const bySegment = segment === "all" ? byCategory : byCategory.filter((p) => segmentsForSlug(p.slug).includes(segment))
  const shownFamilies = family === "all" ? FAMILIES : FAMILIES.filter((f) => f.value === family)
  const total = bySegment.length
  const segObj = SEGMENTS.find((s) => s.key === segment)
  // Segmentos que tienen al menos un aroma (para no listar categorías vacías).
  const availableSegments = SEGMENTS.filter((s) => products.some((p) => segmentsForSlug(p.slug).includes(s.key)))

  return (
    <>
      {/* Barra de progreso de scroll */}
      <div className="fixed inset-x-0 top-0 z-50 h-[3px] bg-transparent">
        <div ref={progressRef} className="h-full origin-left bg-primary" style={{ transform: "scaleX(0)" }} />
      </div>

      <AnnouncementBar />
      <Header />

      <main className="min-h-screen bg-background pb-28 pt-24 md:pt-32">
        {/* ── Encabezado editorial ── */}
        <header className="container mx-auto px-4 pb-8 pt-4 md:pb-12">
          <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-primary md:mb-4">
            La colección
          </p>
          <SplitText
            text="Aromas para cada marca"
            as="h1"
            className="font-serif text-[2.1rem] font-medium leading-[1.05] text-foreground md:text-6xl"
          />
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground md:mt-5">
            {loading
              ? "Curando la colección…"
              : `${products.length} fragancias artesanales, hechas en Colombia. Explóralas por familia olfativa.`}
          </p>
        </header>

        {/* ── Filtros (sin barra de búsqueda) ── */}
        <div className="sticky top-[63px] z-30 border-y border-border/70 bg-background/95 backdrop-blur-md lg:top-[71px]">
          <div className="container mx-auto flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-3.5">
            {/* Categorías por segmento (dropdown de las 12) */}
            <div className="relative flex-shrink-0" ref={catMenuRef}>
              <button
                onClick={() => setCatOpen((o) => !o)}
                aria-expanded={catOpen}
                className="flex w-full items-center justify-between gap-2 rounded-full border border-foreground bg-foreground px-4 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-background transition-opacity hover:opacity-90 sm:w-auto"
              >
                <span className="flex items-center gap-2">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  {segment === "all" ? "Todas las categorías" : SEGMENT_LABEL[segment]}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${catOpen ? "rotate-180" : ""}`} />
              </button>

              {catOpen && (
                <div className="absolute left-0 top-[calc(100%+8px)] z-40 max-h-[70vh] w-[min(20rem,90vw)] overflow-y-auto rounded-2xl border border-border bg-background p-1.5 shadow-[0_24px_60px_-20px_rgba(45,26,20,0.4)] duration-200 animate-in fade-in zoom-in-95 slide-in-from-top-1">
                  <button
                    onClick={() => pickSegment("all")}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${segment === "all" ? "bg-foreground text-background" : "text-foreground hover:bg-secondary"}`}
                  >
                    <span className="font-medium">Todas las categorías</span>
                    <span className={`text-xs ${segment === "all" ? "text-background/70" : "text-muted-foreground"}`}>{products.length}</span>
                  </button>
                  <div className="my-1 h-px bg-border/70" />
                  {availableSegments.map((s) => {
                    const count = products.filter((p) => segmentsForSlug(p.slug).includes(s.key)).length
                    const active = segment === s.key
                    return (
                      <button
                        key={s.key}
                        onClick={() => pickSegment(s.key)}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${active ? "bg-foreground text-background" : "text-foreground hover:bg-secondary"}`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{s.label}</span>
                          <span className={`block truncate text-[0.68rem] ${active ? "text-background/70" : "text-muted-foreground"}`}>{s.tagline}</span>
                        </span>
                        <span className={`text-xs ${active ? "text-background/70" : "text-muted-foreground"}`}>{count}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Familias (pills) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
              <button
                onClick={() => setFamily("all")}
                className={`whitespace-nowrap rounded-full border px-3.5 py-1 text-[0.64rem] font-medium uppercase tracking-[0.1em] transition-colors ${
                  family === "all" ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground"
                }`}
              >
                Todas
              </button>
              {FAMILIES.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFamily(f.value)}
                  className={`whitespace-nowrap rounded-full border px-3.5 py-1 text-[0.64rem] font-medium uppercase tracking-[0.1em] transition-colors ${
                    family === f.value ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Contenido ── */}
        <div ref={contentRef} className="container mx-auto px-4 pt-10 md:pt-14">
          {/* Contexto de categoría/segmento seleccionada */}
          {segment !== "all" && segObj && (
            <div key={segment} className="mb-10 border-l-2 border-primary pl-5 duration-500 animate-in fade-in slide-in-from-left-2">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-primary">Aromas para</p>
              <h2 className="mt-1 font-serif text-2xl font-medium text-foreground md:text-3xl">{segObj.label}</h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">{segObj.tagline}</p>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[4/5] w-full rounded-xl bg-secondary" />
                  <div className="mt-3 h-3.5 w-2/3 bg-secondary" />
                  <div className="mt-2 h-3 w-1/3 bg-secondary" />
                </div>
              ))}
            </div>
          ) : total === 0 ? (
            <div className="py-24 text-center">
              <p className="font-serif text-2xl font-medium text-foreground">No hay aromas en esta categoría</p>
              <button
                onClick={() => { setFamily("all"); setSegment("all") }}
                className="mt-8 inline-flex items-center justify-center rounded-full border border-foreground px-9 py-3.5 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-foreground transition-colors hover:bg-foreground hover:text-background"
              >
                Ver todos los aromas
              </button>
            </div>
          ) : (
            // key por segmento/familia → al cambiar de categoría, las secciones
            // se remontan y los aromas "reorganizan" con su animación escalonada.
            <div key={`${family}-${segment}`} className="space-y-20 duration-500 animate-in fade-in md:space-y-28">
              {shownFamilies.map((f, i) => {
                const fam = byCategory
                  .filter((p) => familyOf(p) === f.value)
                  .filter((p) => segment === "all" || segmentsForSlug(p.slug).includes(segment))
                return (
                  <FamilySection
                    key={f.value}
                    index={family === "all" ? i : FAMILIES.findIndex((x) => x.value === f.value)}
                    label={f.label}
                    tag={f.tag}
                    products={fam}
                    onQuickView={setQuickView}
                  />
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Botón volver arriba */}
      <button
        onClick={scrollTop}
        aria-label="Volver arriba"
        className={`fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background shadow-xl transition-all duration-300 hover:bg-primary ${
          showTop ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        <ArrowUp className="h-5 w-5" />
      </button>

      <Footer />
      <QuickView product={quickView} onClose={() => setQuickView(null)} />
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
