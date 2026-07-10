"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Search, X, Loader2 } from "lucide-react"
import { getSupabaseBrowser } from "@/lib/supabase/client"
import { smartSearch } from "@/lib/fuzzy"

type SearchProduct = {
  id: string
  name: string
  slug: string
  price: number
  image_url: string | null
  image_urls: string[] | null
}

function formatCOP(price: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(price)
}

/**
 * Buscador del header: la lupa se expande EN SU MISMO SITIO a una barra
 * (sin popup). Los resultados caen en un panel anclado bajo la barra.
 * Búsqueda tolerante a errores de tipeo (lib/fuzzy).
 */
export function ProductSearch({ buttonClassName = "" }: { buttonClassName?: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [products, setProducts] = useState<SearchProduct[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Carga perezosa del catálogo la primera vez que se abre.
  const loadProducts = useCallback(async () => {
    if (products) return
    setLoading(true)
    try {
      const { data } = await getSupabaseBrowser()
        .from("products")
        .select("id, name, slug, price, image_url, image_urls, is_active")
        .eq("is_active", true)
      setProducts((data ?? []) as SearchProduct[])
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [products])

  useEffect(() => {
    if (!open) { setQuery(""); setActive(0); return }
    loadProducts()
    // foco tras iniciar la animación de expansión
    const t = setTimeout(() => inputRef.current?.focus(), 120)
    return () => clearTimeout(t)
  }, [open, loadProducts])

  // Cerrar con Escape o clic fuera.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("mousedown", onDown)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("mousedown", onDown)
    }
  }, [open])

  const results = open && query.trim() && products ? smartSearch(query, products, 6) : []
  useEffect(() => setActive(0), [query])

  const go = (slug: string) => {
    setOpen(false)
    router.push(`/productos/${slug}`)
  }

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === "Enter" && results[active]) { e.preventDefault(); go(results[active].slug) }
  }

  return (
    <div ref={rootRef} className="relative flex items-center">
      {/* Barra expandible: nace desde el ancho del icono y crece en el mismo espacio. */}
      <div
        className="flex h-9 items-center overflow-hidden rounded-full transition-[width,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          width: open ? "min(240px, 56vw)" : "36px",
          backgroundColor: open ? "rgba(255,255,255,0.96)" : "transparent",
          boxShadow: open ? "0 8px 30px -6px rgba(45,26,20,0.25), inset 0 0 0 1px rgba(45,26,20,0.08)" : "none",
          backdropFilter: open ? "blur(12px)" : undefined,
        }}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Buscar productos"
          aria-expanded={open}
          className={open ? "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[#A67163]" : buttonClassName}
        >
          <Search className="h-[18px] w-[18px]" />
        </button>

        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onInputKey}
          placeholder="Buscar aroma…"
          tabIndex={open ? 0 : -1}
          aria-hidden={!open}
          className={`h-full min-w-0 flex-1 bg-transparent pr-1 text-[13px] text-[#2D1A14] outline-none placeholder:text-[#2D1A14]/40 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
        />

        {open && (
          <button
            type="button"
            onClick={() => (query ? setQuery("") : setOpen(false))}
            aria-label={query ? "Borrar búsqueda" : "Cerrar búsqueda"}
            className="mr-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[#2D1A14]/35 transition-colors hover:bg-black/5 hover:text-[#2D1A14]"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#A67163]" /> : <X className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {/* Resultados: panel anclado bajo la barra (no un modal). */}
      {open && query.trim() && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-[60] w-[300px] max-w-[86vw] overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_24px_60px_-12px_rgba(45,26,20,0.3)] animate-in fade-in slide-in-from-top-1 duration-200">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-[#2D1A14]/50">
              {loading ? "Buscando…" : "No encontramos aromas con ese nombre."}
            </p>
          ) : (
            <div className="p-1.5">
              {results.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => go(p.slug)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors ${
                    i === active ? "bg-[#F8F2EE]" : ""
                  }`}
                >
                  <span className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-[#FAF8F5]">
                    {(p.image_url || p.image_urls?.[0]) && (
                      <Image
                        src={p.image_url || p.image_urls![0]}
                        alt={p.name}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-[#2D1A14]">{p.name}</span>
                    <span className="text-[12px] text-[#A67163]">{formatCOP(p.price)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
