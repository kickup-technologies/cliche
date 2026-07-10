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

export function ProductSearch({ buttonClassName = "" }: { buttonClassName?: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [products, setProducts] = useState<SearchProduct[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Carga perezosa del catálogo la primera vez que se abre el buscador.
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
    if (open) {
      loadProducts()
      // pequeño delay para que el autofocus funcione tras la animación
      const t = setTimeout(() => inputRef.current?.focus(), 40)
      return () => clearTimeout(t)
    }
    setQuery("")
    setActive(0)
  }, [open, loadProducts])

  // Cerrar con Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    // bloquear scroll del fondo
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open])

  const results = query.trim() && products ? smartSearch(query, products, 7) : []

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
    <>
      {/* Disparador sutil: solo el ícono de lupa. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buscar productos"
        className={buttonClassName}
      >
        <Search className="h-[18px] w-[18px]" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh] sm:pt-[15vh]"
          role="dialog"
          aria-modal="true"
        >
          {/* Fondo */}
          <button
            aria-label="Cerrar búsqueda"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[#2D1A14]/40 backdrop-blur-sm animate-in fade-in duration-200"
          />

          {/* Panel */}
          <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_24px_70px_-12px_rgba(45,26,20,0.35)] animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200">
            {/* Input */}
            <div className="flex items-center gap-3 border-b border-black/[0.06] px-4">
              <Search className="h-5 w-5 flex-shrink-0 text-[#A67163]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Busca un aroma por nombre…"
                className="h-14 w-full bg-transparent text-[15px] text-[#2D1A14] outline-none placeholder:text-[#2D1A14]/35"
              />
              {loading && <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-[#A67163]" />}
              <button onClick={() => setOpen(false)} aria-label="Cerrar" className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[#2D1A14]/40 transition-colors hover:bg-black/5 hover:text-[#2D1A14]">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Resultados */}
            {query.trim() && (
              <div className="max-h-[52vh] overflow-y-auto p-2">
                {results.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-[#2D1A14]/50">
                    {loading ? "Buscando…" : <>No encontramos aromas para “<span className="font-medium">{query}</span>”.</>}
                  </p>
                ) : (
                  results.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => go(p.slug)}
                      onMouseEnter={() => setActive(i)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        i === active ? "bg-[#F8F2EE]" : "hover:bg-[#FAF8F5]"
                      }`}
                    >
                      <span className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg bg-[#FAF8F5]">
                        {(p.image_url || p.image_urls?.[0]) && (
                          <Image
                            src={p.image_url || p.image_urls![0]}
                            alt={p.name}
                            fill
                            sizes="44px"
                            className="object-cover"
                          />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-[#2D1A14]">{p.name}</span>
                        <span className="text-[13px] text-[#A67163]">{formatCOP(p.price)}</span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Estado inicial (sin texto) */}
            {!query.trim() && (
              <p className="px-4 py-6 text-center text-[13px] text-[#2D1A14]/40">
                Escribe el nombre de un aroma. Aunque tengas un error de tipeo, te lo encontramos.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
