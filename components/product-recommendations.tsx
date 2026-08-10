"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useCart } from "@/context/cart-context"
import { useRecentlyViewed } from "@/lib/recently-viewed"
import { recommend } from "@/lib/recommend"
import type { Product } from "@/lib/supabase"

interface Props {
  product: Product
  /** recomendados desde el servidor, usados mientras carga el pool del cliente */
  fallback: Product[]
}

type Tab = "reco" | "recent"

interface Card {
  id: string
  slug: string
  name: string
  image_url: string | null
  price: number
  product?: Product
}

function fmt(n: number) {
  return n.toLocaleString("es-CO")
}

export function ProductRecommendations({ product, fallback }: Props) {
  const { addItem } = useCart()
  const [tab, setTab] = useState<Tab>("reco")
  const [pool, setPool] = useState<Product[]>([])
  const recent = useRecentlyViewed(product.slug)

  // Pool completo de productos para alimentar el algoritmo de recomendación
  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((all: Product[]) => { if (Array.isArray(all)) setPool(all) })
      .catch(() => {})
  }, [])

  const recentSlugs = useMemo(() => recent.map((r) => r.slug), [recent])

  const recoCards: Card[] = useMemo(() => {
    const list = pool.length ? recommend(product, pool, recentSlugs, 4) : fallback
    return list.map((p) => ({
      id: p.id, slug: p.slug, name: p.name, image_url: p.image_url ?? null, price: p.price, product: p,
    }))
  }, [pool, product, recentSlugs, fallback])

  const recentCards: Card[] = useMemo(
    () => recent.slice(0, 8).map((r) => ({
      ...r,
      product: pool.find((p) => p.slug === r.slug),
    })),
    [recent, pool],
  )

  const cards = tab === "recent" ? recentCards : recoCards

  return (
    <section className="mt-24 lg:mt-28">
      {/* Cabecera con toggle estilo pestañas */}
      <div className="flex items-center justify-center gap-8 mb-10 border-b border-foreground/[0.08]">
        <button
          onClick={() => setTab("reco")}
          className={`relative pb-4 text-sm font-medium tracking-wide transition-colors ${
            tab === "reco" ? "text-foreground" : "text-muted-foreground hover:text-foreground/80"
          }`}
        >
          Te puede gustar
          <span
            className={`absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-primary transition-transform duration-300 ${
              tab === "reco" ? "scale-x-100" : "scale-x-0"
            }`}
          />
        </button>
        <button
          onClick={() => setTab("recent")}
          className={`relative pb-4 text-sm font-medium tracking-wide transition-colors ${
            tab === "recent" ? "text-foreground" : "text-muted-foreground hover:text-foreground/80"
          }`}
        >
          Vistos recientemente
          <span
            className={`absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-primary transition-transform duration-300 ${
              tab === "recent" ? "scale-x-100" : "scale-x-0"
            }`}
          />
        </button>
      </div>

      {cards.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-10">
          {tab === "recent" ? "Aún no has visto otros aromas." : "Pronto más recomendaciones."}
        </p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {cards.map((c) => (
            <div
              key={c.id}
              className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 flex flex-col animate-in fade-in duration-500"
            >
              <Link href={`/productos/${c.slug}`}>
                <div className="aspect-square bg-muted/30 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.image_url || "/placeholder.jpg"}
                    alt={c.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </Link>
              <div className="p-3 flex flex-col gap-2 flex-1">
                <Link href={`/productos/${c.slug}`}>
                  <p className="font-medium text-sm text-foreground line-clamp-1 hover:text-primary transition-colors">{c.name}</p>
                </Link>
                <p className="text-primary font-bold text-sm">${fmt(c.price)} COP</p>
                {c.product ? (
                  <button
                    onClick={() => addItem(c.product!)}
                    className="mt-auto w-full py-1.5 text-xs font-semibold rounded-xl border border-primary text-primary hover:bg-primary hover:text-white transition-colors"
                  >
                    + Agregar
                  </button>
                ) : (
                  <Link
                    href={`/productos/${c.slug}`}
                    className="mt-auto w-full py-1.5 text-center text-xs font-semibold rounded-xl border border-foreground/15 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    Ver aroma
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
