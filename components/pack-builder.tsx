"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { X, Plus, Minus, Check, Sparkles } from "lucide-react"
import { useCart } from "@/context/cart-context"
import { PRICE_TIERS, TIER_BY_ID, UNIT_PRICE, tierSavings, type PriceTier } from "@/lib/pricing"
import type { Product } from "@/lib/supabase"

const CREMA = "#FAF8F5"
const CAFE = "#2D1A14"
const TERRA = "#A67163"

const KIT_TIERS = PRICE_TIERS.filter((t) => t.units > 1)
const fmt = (n: number) => `$${n.toLocaleString("es-CO")}`

/**
 * PackBuilder — constructor de "kit personalizado": el cliente elige el tamaño
 * (x3/x4/x6) y combina diferentes aromas hasta completar los frascos del kit.
 * Precio FIJO del tier (mismo ahorro que un kit del mismo aroma). Reutilizable:
 * se abre desde la ficha de producto y desde el landing.
 */
export function PackBuilder({
  open,
  onClose,
  seedProductId,
  initialTier = "x4",
}: {
  open: boolean
  onClose: () => void
  seedProductId?: string
  initialTier?: string
}) {
  const { addPack, openDrawer } = useCart()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [tierId, setTierId] = useState(initialTier)
  const [picked, setPicked] = useState<Record<string, number>>({})
  const [added, setAdded] = useState(false)

  const tier: PriceTier = TIER_BY_ID[tierId] ?? TIER_BY_ID["x4"]
  const count = Object.values(picked).reduce((s, n) => s + n, 0)
  const complete = count === tier.units

  // Cargar aromas (solo una vez, al abrir por primera vez)
  useEffect(() => {
    if (!open || products.length) return
    setLoading(true)
    fetch("/api/products")
      .then((r) => r.json())
      .then((data: Product[]) => {
        const aromas = (Array.isArray(data) ? data : []).filter(
          (p) => p.is_active !== false && !p.slug?.startsWith("kit-") && (p.stock ?? 1) > 0
        )
        setProducts(aromas)
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [open, products.length])

  // Pre-seleccionar el aroma de la ficha desde la que se abrió
  useEffect(() => {
    if (open && seedProductId && products.some((p) => p.id === seedProductId)) {
      setPicked((prev) => (Object.keys(prev).length ? prev : { [seedProductId]: 1 }))
    }
  }, [open, seedProductId, products])

  // Bloquear scroll de fondo mientras está abierto
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [open])

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  const inc = useCallback((id: string) => {
    setPicked((prev) => {
      const total = Object.values(prev).reduce((s, n) => s + n, 0)
      if (total >= tier.units) return prev
      const stock = productById.get(id)?.stock ?? 99
      if ((prev[id] || 0) >= stock) return prev
      return { ...prev, [id]: (prev[id] || 0) + 1 }
    })
  }, [tier.units, productById])

  const dec = useCallback((id: string) => {
    setPicked((prev) => {
      const next = { ...prev }
      if (!next[id]) return prev
      next[id] -= 1
      if (next[id] <= 0) delete next[id]
      return next
    })
  }, [])

  // Si bajo de tamaño de kit y me paso, recorto la selección
  useEffect(() => {
    setPicked((prev) => {
      let total = Object.values(prev).reduce((s, n) => s + n, 0)
      if (total <= tier.units) return prev
      const next = { ...prev }
      for (const id of Object.keys(next)) {
        while (total > tier.units && next[id] > 0) { next[id] -= 1; total -= 1 }
        if (next[id] <= 0) delete next[id]
      }
      return next
    })
  }, [tier.units])

  const handleAdd = () => {
    if (!complete) return
    const components = Object.entries(picked).map(([product_id, quantity]) => {
      const p = productById.get(product_id)
      return {
        product_id,
        quantity,
        name: p?.name ?? "Aroma",
        image_url: p?.image_url ?? "/images/placeholder.jpg",
      }
    })
    addPack(tier, components)
    setAdded(true)
    setTimeout(() => {
      setAdded(false)
      setPicked({})
      onClose()
      openDrawer()
    }, 650)
  }

  if (!open) return null

  return (
    // data-lenis-prevent: Lenis ignora la rueda dentro del modal → el scroll
    // ocurre EN el popup (lista de aromas), no en el fondo.
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Arma tu kit personalizado"
      data-lenis-prevent
    >
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden shadow-2xl sm:h-[88vh] sm:max-h-[88vh] sm:max-w-3xl sm:rounded-3xl"
        style={{ backgroundColor: CREMA }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-8 sm:py-5" style={{ borderColor: `${CAFE}14` }}>
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: TERRA }} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.34em]" style={{ color: TERRA }}>
                A tu medida
              </span>
            </div>
            <h2 className="mt-1 font-serif text-2xl sm:text-3xl" style={{ color: CAFE }}>
              Arma tu kit personalizado
            </h2>
            <p className="mt-1 text-xs sm:text-sm" style={{ color: `${CAFE}99` }}>
              Combina los aromas que quieras. Mismo precio del kit, total libertad.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-2 transition-colors hover:bg-black/5"
            style={{ color: CAFE }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Selector de tamaño */}
        <div className="flex gap-2 px-5 py-3 sm:px-8" style={{ backgroundColor: `${TERRA}0D` }}>
          {KIT_TIERS.map((t) => {
            const active = t.id === tierId
            return (
              <button
                key={t.id}
                onClick={() => setTierId(t.id)}
                className="flex-1 rounded-xl border px-2 py-2 text-center transition-all"
                style={{
                  borderColor: active ? TERRA : `${CAFE}1F`,
                  backgroundColor: active ? TERRA : "transparent",
                  color: active ? CREMA : CAFE,
                }}
              >
                <span className="block text-sm font-semibold">Kit x{t.units}</span>
                <span className="block text-[10px] opacity-80">{fmt(t.price)}</span>
              </button>
            )
          })}
        </div>

        {/* Lista de aromas (scroll nativo aislado del fondo) */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-8" data-lenis-prevent>
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl" style={{ backgroundColor: `${CAFE}0D` }} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {products.map((p) => {
                const qty = picked[p.id] || 0
                const selected = qty > 0
                const canAdd = count < tier.units && qty < (p.stock ?? 99)
                return (
                  <div
                    key={p.id}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border transition-all"
                    style={{
                      borderColor: selected ? TERRA : `${CAFE}14`,
                      backgroundColor: "#fff",
                      boxShadow: selected ? `0 0 0 1px ${TERRA}` : "none",
                    }}
                  >
                    <button
                      onClick={() => (canAdd ? inc(p.id) : undefined)}
                      className="relative aspect-square w-full overflow-hidden"
                      style={{ backgroundColor: `${TERRA}0D`, cursor: canAdd ? "pointer" : "default" }}
                      aria-label={`Añadir ${p.name}`}
                    >
                      <Image
                        src={p.image_url || "/images/placeholder.jpg"}
                        alt={p.name}
                        fill
                        sizes="(max-width:640px) 45vw, 200px"
                        className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                      />
                      {selected && (
                        <span
                          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                          style={{ backgroundColor: TERRA, color: CREMA }}
                        >
                          {qty}
                        </span>
                      )}
                    </button>

                    <div className="flex flex-1 flex-col justify-between p-2.5">
                      <p className="font-serif text-[13px] leading-tight" style={{ color: CAFE }}>
                        {p.name}
                      </p>
                      {qty === 0 ? (
                        <button
                          onClick={() => inc(p.id)}
                          disabled={count >= tier.units}
                          className="mt-2 flex items-center justify-center gap-1 rounded-full border py-1.5 text-[11px] font-medium transition-all disabled:opacity-30"
                          style={{ borderColor: TERRA, color: TERRA }}
                        >
                          <Plus className="h-3 w-3" /> Añadir
                        </button>
                      ) : (
                        <div className="mt-2 flex items-center justify-between rounded-full border" style={{ borderColor: `${CAFE}1F` }}>
                          <button onClick={() => dec(p.id)} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-black/5" style={{ color: CAFE }} aria-label="Quitar uno">
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="text-sm font-semibold" style={{ color: CAFE }}>{qty}</span>
                          <button onClick={() => inc(p.id)} disabled={!canAdd} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-black/5 disabled:opacity-25" style={{ color: CAFE }} aria-label="Añadir uno">
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer fijo: progreso + precio + CTA (respeta safe-area en móvil) */}
        <div
          className="border-t px-5 py-4 sm:px-8"
          style={{ borderColor: `${CAFE}14`, backgroundColor: CREMA, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
        >
          {/* Progreso */}
          <div className="mb-3 flex items-center gap-1.5">
            {Array.from({ length: tier.units }).map((_, i) => (
              <span
                key={i}
                className="h-1.5 flex-1 rounded-full transition-all"
                style={{ backgroundColor: i < count ? TERRA : `${CAFE}1A` }}
              />
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="text-xs" style={{ color: `${CAFE}99` }}>
                {complete ? "¡Kit completo!" : `${count} de ${tier.units} frascos elegidos`}
              </p>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="font-serif text-2xl" style={{ color: CAFE }}>{fmt(tier.price)}</span>
                <span className="text-xs line-through" style={{ color: `${CAFE}66` }}>{fmt(tier.units * UNIT_PRICE)}</span>
                <span className="text-[11px] font-semibold" style={{ color: TERRA }}>
                  Ahorras {fmt(tierSavings(tier))}
                </span>
              </div>
            </div>

            <button
              onClick={handleAdd}
              disabled={!complete || added}
              className="flex w-full flex-shrink-0 items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto sm:py-3"
              style={{ backgroundColor: added ? "#3b7a4e" : CAFE, color: CREMA }}
            >
              {added ? (<><Check className="h-4 w-4" /> Añadido</>) : "Añadir al carrito"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
