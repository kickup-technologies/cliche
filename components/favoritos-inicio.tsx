"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Check, X } from "lucide-react"
import { useCart } from "@/context/cart-context"
import { FAMILIES, familyOf } from "@/lib/families"
import { TiendaCard, nombreCorto } from "@/components/tienda-card"
import type { Product } from "@/lib/supabase"

/**
 * "Nuestros favoritos" en el inicio (como la vitrina de Bienestar): una
 * selección de la casa en cuadrícula, centrada, con chips que filtran por la
 * familia REAL de cada aroma. Favoritos = los que la marca destaca desde el
 * panel (más vendido, nuevo…) y, si faltan, el resto en orden de familia.
 */
export function FavoritosInicio() {
  const { addItem, openDrawer, items } = useCart()
  const [products, setProducts] = useState<Product[]>([])
  const [familia, setFamilia] = useState<string | null>(null)
  const [aviso, setAviso] = useState<Product | null>(null)

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data.filter((p: Product) => p.slug !== "prueba" && familyOf(p) !== null) : []))
      .catch(() => {})
  }, [])
  useEffect(() => {
    if (!aviso) return
    const t = window.setTimeout(() => setAviso(null), 4500)
    return () => window.clearTimeout(t)
  }, [aviso])

  const lista = useMemo(() => {
    const famIdx = (p: Product) => FAMILIES.findIndex((f) => f.value === familyOf(p))
    const orden = [...products].sort((a, b) => (a.badge ? 0 : 100) + famIdx(a) - ((b.badge ? 0 : 100) + famIdx(b)))
    return familia ? orden.filter((p) => familyOf(p) === familia) : orden.slice(0, 8)
  }, [products, familia])
  const familias = FAMILIES.filter((f) => products.some((p) => familyOf(p) === f.value))

  if (products.length === 0) return null
  return (
    <section className="favoritos-cl" aria-labelledby="favoritos-titulo">
      <div className="favoritos-cl-cabeza">
        <span className="favoritos-cl-eyebrow">Seleccionados para ti</span>
        <h2 id="favoritos-titulo">{familia ? FAMILIES.find((f) => f.value === familia)?.label : "Nuestros favoritos"}</h2>
        <p>{familia ? "Todos los aromas de esta familia." : "Una selección de la casa para empezar."}</p>
      </div>
      <div className="tienda-chips favoritos-cl-chips" role="group" aria-label="Familias">
        <button type="button" className={!familia ? "active" : ""} aria-pressed={!familia} onClick={() => setFamilia(null)}>Favoritos</button>
        {familias.map((f) => (
          <button type="button" key={f.value} className={familia === f.value ? "active" : ""} aria-pressed={familia === f.value} onClick={() => setFamilia(f.value)}>{f.label}</button>
        ))}
      </div>
      <div className="tienda-productos favoritos-cl-grid">
        {lista.map((p) => <TiendaCard key={p.id} product={p} onAdd={(x) => { addItem(x); setAviso(x) }} />)}
      </div>
      <div className={`tienda-aviso${aviso ? " is-visible" : ""}`} role="status" aria-live="polite">
        {aviso && (
          <>
            <Check size={17} aria-hidden="true" />
            <span><b>{nombreCorto(aviso)}</b> está en tu carrito</span>
            <button type="button" className="tienda-aviso-ver" onClick={() => { setAviso(null); openDrawer() }}>Ver carrito ({items.reduce((n, i) => n + i.quantity, 0)})</button>
            <button type="button" aria-label="Cerrar aviso" onClick={() => setAviso(null)}><X size={15} /></button>
          </>
        )}
      </div>
      <p className="favoritos-cl-todos"><Link href="/catalogo">Ver la tienda completa</Link></p>
    </section>
  )
}
