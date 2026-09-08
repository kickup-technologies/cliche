"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { LayoutGrid, Plus, X, RefreshCw, AlertCircle, ExternalLink, Search, EyeOff, Undo2 } from "lucide-react"
import type { Product } from "@/lib/supabase"
import { adminFetch } from "@/lib/admin-client"
import { FAMILIES, familyOf, SIN_FAMILIA } from "@/lib/families"
import { PRODUCT_PLACEHOLDER } from "@/lib/placeholder"

/**
 * Editor de catálogo — réplica 1:1 de /catalogo (agrupado por familia
 * olfativa, con la MISMA lógica lib/families) donde cada familia se edita:
 * "＋ Añadir aroma" abre un popup con los aromas que NO están en esa familia
 * y un clic los mueve; la ✕ de cada tarjeta lo saca de la familia. Todo se
 * guarda al instante (PUT products → revalida /catalogo).
 */

const fmt = (n: number) => "$" + Number(n || 0).toLocaleString("es-CO")

export function CatalogoEditorSection() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [savingId, setSavingId] = useState<string | null>(null)
  // Popup "añadir a la familia X": guarda la familia destino.
  const [addTo, setAddTo] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const load = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/products")
      const data = await res.json()
      setProducts(Array.isArray(data) ? data : [])
      if (!res.ok) setError((data as { error?: string })?.error || "No se pudieron cargar los aromas.")
      else setError("")
    } catch {
      setError("No se pudieron cargar los aromas.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  /** Cambia la familia de un producto (o lo saca de todas con SIN_FAMILIA). */
  async function moveTo(product: Product, family: string) {
    setSavingId(product.id)
    setError("")
    // Optimista: el cambio se ve al instante y se revierte si el servidor falla.
    const prev = products
    setProducts(ps => ps.map(p => p.id === product.id ? { ...p, category: family } : p))
    try {
      const res = await adminFetch(`/api/admin/products/${product.id}`, {
        method: "PUT",
        body: JSON.stringify({ category: family }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setProducts(prev)
        setError(d.error || `No se pudo mover «${product.name}».`)
      }
    } catch {
      setProducts(prev)
      setError("Error de conexión. Intenta de nuevo.")
    } finally {
      setSavingId(null)
    }
  }

  const byFamily = useMemo(() => {
    const map: Record<string, Product[]> = {}
    for (const f of FAMILIES) map[f.value] = []
    const hidden: Product[] = []
    for (const p of products) {
      const fam = familyOf(p)
      if (fam === null) hidden.push(p)
      else (map[fam] ??= []).push(p)
    }
    return { map, hidden }
  }, [products])

  const familyLabel = (value: string) => FAMILIES.find(f => f.value === value)?.label || "—"

  // Candidatos del popup: todos los aromas que NO están ya en la familia destino.
  const candidates = useMemo(() => {
    if (!addTo) return []
    const q = search.trim().toLowerCase()
    return products
      .filter(p => familyOf(p) !== addTo)
      .filter(p => !q || p.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [addTo, products, search])

  if (loading) {
    return <div className="py-20 flex justify-center"><RefreshCw className="w-6 h-6 animate-spin text-[#A67163]" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#2D1A14] flex items-center gap-2">
            <LayoutGrid className="w-6 h-6 text-[#A67163]" /> Catálogo por familias
          </h1>
          <p className="text-sm text-[#9e8a84] mt-1">
            La misma vista de la página del catálogo. Añade o quita aromas de cada familia y el cambio se publica al instante.
          </p>
        </div>
        <a
          href="/catalogo"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-medium text-[#A67163] hover:underline"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Ver catálogo real
        </a>
      </div>

      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
        </p>
      )}

      {/* ── Réplica del catálogo por familias ── */}
      <div className="bg-background rounded-2xl border border-[#2D1A14]/10 shadow-sm px-4 sm:px-8 py-10 space-y-16">
        {FAMILIES.map((f, i) => {
          const fam = byFamily.map[f.value] || []
          return (
            <section key={f.value}>
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-primary">
                Familia {String(i + 1).padStart(2, "0")}
              </p>
              <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
                <h2 className="font-serif text-3xl font-medium text-foreground">{f.label}</h2>
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  {fam.length} aroma{fam.length !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted-foreground">{f.tag}</p>

              <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
                {fam.map(p => (
                  <div key={p.id} className="group relative">
                    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-secondary/50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.image_url || PRODUCT_PLACEHOLDER}
                        alt={p.name}
                        className={`h-full w-full object-cover ${p.is_active ? "" : "opacity-40 grayscale"}`}
                      />
                      {p.badge && (
                        <span className={`absolute top-2.5 left-2.5 ${p.badge_color || "bg-primary"} text-white text-[10px] font-bold px-2.5 py-1 rounded-full`}>
                          {p.badge}
                        </span>
                      )}
                      {!p.is_active && (
                        <span className="absolute bottom-2.5 left-2.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#2D1A14]/80 text-white">
                          Oculto en la tienda
                        </span>
                      )}
                      {/* Quitar de la familia */}
                      <button
                        onClick={() => moveTo(p, SIN_FAMILIA)}
                        disabled={savingId === p.id}
                        title={`Quitar «${p.name}» de ${f.label}`}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/95 border border-[#2D1A14]/10 shadow-sm flex items-center justify-center text-[#2D1A14]/60 hover:text-red-600 hover:border-red-300 transition-colors"
                      >
                        {savingId === p.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <X className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="mt-2.5 text-sm font-medium text-foreground leading-snug">{p.name}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{fmt(p.price)}</p>
                  </div>
                ))}

                {/* Añadir aroma a esta familia */}
                <button
                  onClick={() => { setAddTo(f.value); setSearch("") }}
                  className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#2D1A14]/15 text-[#2D1A14]/35 hover:border-[#A67163]/60 hover:text-[#A67163] hover:bg-white/60 transition-colors"
                >
                  <Plus className="w-7 h-7" />
                  <span className="text-xs font-semibold uppercase tracking-[0.15em]">Añadir aroma</span>
                </button>
              </div>
            </section>
          )
        })}

        {/* Aromas fuera de todas las familias */}
        {byFamily.hidden.length > 0 && (
          <section className="border-t border-[#2D1A14]/10 pt-10">
            <div className="flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-serif text-2xl font-medium text-foreground">Sin familia</h2>
            </div>
            <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Estos aromas no aparecen en el catálogo por familias (siguen visibles en el resto de la tienda). Devuélvelos con el botón o añádelos desde cualquier familia.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {byFamily.hidden.map(p => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl border border-[#2D1A14]/10 bg-white p-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image_url || PRODUCT_PLACEHOLDER} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{fmt(p.price)}</p>
                  </div>
                  <button
                    onClick={() => moveTo(p, FAMILY_FALLBACK(p))}
                    disabled={savingId === p.id}
                    title="Devolver a su familia original"
                    className="w-8 h-8 rounded-lg border border-[#2D1A14]/15 flex items-center justify-center text-[#2D1A14]/50 hover:text-[#A67163] hover:border-[#A67163]/50 transition-colors flex-shrink-0"
                  >
                    {savingId === p.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-4 h-4" />}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── Popup: añadir aroma a una familia ── */}
      {addTo && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setAddTo(null)}>
          <div
            className="bg-white rounded-2xl border border-[#2D1A14]/10 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[#2D1A14]/8 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-[#2D1A14]">Añadir a {familyLabel(addTo)}</h3>
                <p className="text-xs text-[#2D1A14]/50 mt-0.5">Un clic mueve el aroma a esta familia y se publica al instante.</p>
              </div>
              <button onClick={() => setAddTo(null)} className="w-8 h-8 rounded-lg hover:bg-[#FAF8F5] flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 pt-4">
              <div className="relative">
                <Search className="w-4 h-4 text-[#2D1A14]/30 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar aroma…"
                  autoFocus
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#2D1A14]/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1.5">
              {candidates.length === 0 ? (
                <p className="text-sm text-[#2D1A14]/50 text-center py-8">
                  {search ? "Ningún aroma coincide con la búsqueda." : "Todos los aromas ya están en esta familia."}
                </p>
              ) : candidates.map(p => {
                const current = familyOf(p)
                return (
                  <button
                    key={p.id}
                    onClick={async () => { await moveTo(p, addTo) }}
                    disabled={savingId === p.id}
                    className="w-full flex items-center gap-3 rounded-xl border border-transparent hover:border-[#A67163]/40 hover:bg-[#FAF8F5] p-2 text-left transition-colors disabled:opacity-50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.image_url || PRODUCT_PLACEHOLDER} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#2D1A14] truncate">{p.name}</p>
                      <p className="text-xs text-[#2D1A14]/45">
                        {current === null ? "Sin familia" : `Ahora en ${familyLabel(current)}`} · {fmt(p.price)}
                      </p>
                    </div>
                    {savingId === p.id
                      ? <RefreshCw className="w-4 h-4 animate-spin text-[#A67163] flex-shrink-0" />
                      : <Plus className="w-4 h-4 text-[#A67163] flex-shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Familia a la que vuelve un aroma "sin familia": su mapeo histórico. */
function FAMILY_FALLBACK(p: Product): string {
  const sinCategoria = familyOf({ slug: p.slug, category: null })
  return sinCategoria ?? "frescos"
}
