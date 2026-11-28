"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Check, Heart } from "lucide-react"
import { useFavorites } from "@/context/favorites-context"
import { familyOf } from "@/lib/families"
import { PRODUCT_PLACEHOLDER } from "@/lib/placeholder"
import type { Product } from "@/lib/supabase"
import { COLECCION_FOTO, COLECCION_NOMBRE, COLECCION_PATH, PRECIO_COLECCION, enBlackFriday } from "@/lib/coleccion"

const fmt = (n: number) => `$${n.toLocaleString("es-CO")}`

const SINGULAR: Record<string, string> = { citricos: "cítrico", florales: "floral", amaderados: "amaderado", dulces: "dulce", frescos: "fresco" }

/** "Aroma Agua — Fragancia Fresca" → "Agua": el nombre corto de la tarjeta. */
export const nombreCorto = (p: Product) => p.name.replace(/^Aroma\s+/i, "").split(" — ")[0]

/**
 * Tarjeta de la tienda, al estilo de las grandes tiendas de cuidado personal:
 * foto vertical, nombre, tipo y precio centrados, y un botón AGREGAR de ancho
 * completo. Al agregar avisa abajo con un acceso al carrito.
 */
export function TiendaCard({ product, onAdd }: { product: Product; onAdd: (p: Product) => void }) {
  const { toggleFavorite, isFavorite } = useFavorites()
  const [hover, setHover] = useState(false)
  const [added, setAdded] = useState(false)
  useEffect(() => {
    if (!added) return
    const t = window.setTimeout(() => setAdded(false), 1600)
    return () => window.clearTimeout(t)
  }, [added])
  const fav = isFavorite(product.id)
  const fam = familyOf(product)
  const foto2 = product.image_urls?.[1]
  const agotado = product.stock === 0

  return (
    <article className="tienda-card" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="tienda-foto">
        <Link href={`/productos/${product.slug}`} aria-label={`Ver ${nombreCorto(product)}`} tabIndex={-1}>
          <Image src={(hover && foto2) || product.image_url || PRODUCT_PLACEHOLDER} alt={product.name} fill quality={85} sizes="(max-width:700px) 46vw, (max-width:1100px) 30vw, 260px" />
        </Link>
        <button type="button" className={`tienda-corazon ${fav ? "is-liked" : ""}`} aria-label={`${fav ? "Quitar de" : "Añadir a"} favoritos: ${nombreCorto(product)}`} aria-pressed={fav} onClick={() => toggleFavorite(product)}>
          <Heart size={17} fill={fav ? "currentColor" : "none"} />
        </button>
        {product.badge && <span className="tienda-sello">{product.badge}</span>}
      </div>
      <div className="tienda-info">
        <h3><Link href={`/productos/${product.slug}`}>{nombreCorto(product)}</Link></h3>
        <span className="tienda-tipo">{fam ? `Aroma ${SINGULAR[fam] ?? ""} · 250 ml` : "Aroma · 250 ml"}</span>
        <strong>{fmt(product.price)}</strong>
        <button type="button" className="tienda-agregar" disabled={agotado} onClick={() => { onAdd(product); setAdded(true) }}>
          {agotado ? "AGOTADO" : added ? <><Check size={15} aria-hidden="true" /> AGREGADO</> : "AGREGAR"}
        </button>
      </div>
    </article>
  )
}


/** La «Colección de Navidad» en la tienda: lleva a su ficha (ahí se elige cuántas y se pide). */
export function TarjetaColeccion() {
  const [bf, setBf] = useState(false)
  useEffect(() => setBf(enBlackFriday()), [])
  return (
    <article className="tienda-card">
      <div className="tienda-foto">
        <Link href={COLECCION_PATH} aria-label={`Ver ${COLECCION_NOMBRE}`} tabIndex={-1}>
          <Image src={COLECCION_FOTO} alt={`${COLECCION_NOMBRE}: Navidad, Calor de Lana, Tierra y Sello de Dios`} fill quality={85} sizes="(max-width:700px) 46vw, (max-width:1100px) 30vw, 260px" />
        </Link>
        <span className="tienda-sello">{bf ? "BLACK FRIDAY" : "NAVIDAD"}</span>
      </div>
      <div className="tienda-info">
        <h3><Link href={COLECCION_PATH}>{COLECCION_NOMBRE}</Link></h3>
        <span className="tienda-tipo">4 aromas · 250 ml</span>
        <strong>{fmt(PRECIO_COLECCION)}</strong>
        <Link href={COLECCION_PATH} className="tienda-agregar">VER LA COLECCIÓN</Link>
      </div>
    </article>
  )
}
