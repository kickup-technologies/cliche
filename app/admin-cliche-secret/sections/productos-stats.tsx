"use client"
import { useState } from "react"
import Image from "next/image"
import { TrendingUp, TrendingDown, Minus, AlertCircle, Package, Trophy, MousePointerClick, ImageOff } from "lucide-react"
import { Order, PageView, Period, CONFIRMED, filterPeriod, filterPrevPeriod, fmt } from "../types"
import { PeriodSelector } from "../components/period-selector"
import type { Product } from "@/lib/supabase"

function productImg(p?: { image_url?: string; image_urls?: string[] } | null): string | null {
  if (!p) return null
  if (p.image_url) return p.image_url
  if (Array.isArray(p.image_urls) && p.image_urls[0]) return p.image_urls[0]
  return null
}

/** Tarjeta visual de producto destacado con imagen + métricas. */
function HighlightCard({
  title, icon, accent, product, lines, empty,
}: {
  title: string
  icon: React.ReactNode
  accent: string
  product?: Product | null
  lines: string[]
  empty: string
}) {
  const img = productImg(product)
  return (
    <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${accent}`}>{icon}</span>
        <p className="text-xs text-[#2D1A14]/50 font-semibold uppercase tracking-wider">{title}</p>
      </div>
      {product ? (
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-[#F4EFE9] flex-shrink-0 flex items-center justify-center">
            {img ? (
              <Image src={img} alt={product.name} fill sizes="64px" className="object-cover" />
            ) : (
              <ImageOff className="w-6 h-6 text-[#2D1A14]/20" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#2D1A14] truncate">{product.name}</p>
            {lines.map((l, i) => (
              <p key={i} className="text-xs text-[#2D1A14]/45 mt-0.5">{l}</p>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-[#2D1A14]/35 italic py-3">{empty}</p>
      )}
    </div>
  )
}

export function ProductosStatsSection({ orders, products, pageViews }: { orders: Order[]; products: Product[]; pageViews: PageView[] }) {
  const [period, setPeriod] = useState<Period>("1m")

  const curr = filterPeriod(orders, period).filter(o => CONFIRMED.includes(o.status))
  const prev = filterPrevPeriod(orders, period).filter(o => CONFIRMED.includes(o.status))

  // Build product stats
  const buildStats = (orderSet: Order[]) => {
    const stats: Record<string, { name: string; units: number; revenue: number }> = {}
    for (const o of orderSet) {
      for (const item of o.items || []) {
        const k = item.product_id || item.name || "otros"
        if (!stats[k]) stats[k] = { name: item.name || k, units: 0, revenue: 0 }
        stats[k].units += item.quantity
        stats[k].revenue += (item.price || 0) * item.quantity
      }
    }
    return stats
  }

  const currStats = buildStats(curr)
  const prevStats = buildStats(prev)

  const productRows = products.map(p => {
    const c = currStats[p.id] || { name: p.name, units: 0, revenue: 0 }
    const pr = prevStats[p.id] || { name: p.name, units: 0, revenue: 0 }
    const velocity = c.units / 30
    const trend: "up" | "down" | "same" = c.units > pr.units ? "up" : c.units < pr.units ? "down" : "same"
    return { ...p, units: c.units, revenue: c.revenue, prevUnits: pr.units, velocity, trend }
  }).sort((a, b) => b.revenue - a.revenue)

  const bestProduct = productRows[0]
  const worstProduct = [...productRows].filter(p => p.is_active).sort((a, b) => a.revenue - b.revenue)[0]
  const atRisk = products.filter(p => p.stock <= 5)
  const dormant = productRows.filter(p => p.is_active && p.units === 0)
  const totalRevenue = productRows.reduce((s, p) => s + p.revenue, 0)

  // ── Producto más visitado (clicks reales en su página /productos/<slug>) ──
  const visitsBySlug: Record<string, number> = {}
  for (const v of pageViews || []) {
    const m = v.path?.match(/^\/productos\/([^/?#]+)/)
    if (m) visitsBySlug[m[1]] = (visitsBySlug[m[1]] || 0) + 1
  }
  const mostVisited = [...products]
    .map(p => ({ p, visits: visitsBySlug[p.slug] || 0 }))
    .sort((a, b) => b.visits - a.visits)[0]
  const mostVisitedProduct = mostVisited && mostVisited.visits > 0 ? mostVisited.p : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#2D1A14]">Productos</h2>
          <p className="text-sm text-[#2D1A14]/50 mt-0.5">Rendimiento por producto y velocidad de venta</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Análisis de tienda — destacados con imagen + números */}
      <div>
        <p className="text-xs text-[#2D1A14]/45 font-semibold uppercase tracking-wider mb-3">Análisis de tienda</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <HighlightCard
            title="Más vendido"
            icon={<Trophy className="w-4 h-4 text-emerald-600" />}
            accent="bg-emerald-50"
            product={bestProduct && bestProduct.units > 0 ? bestProduct : null}
            lines={bestProduct ? [`${bestProduct.units} uds vendidas`, `${fmt(bestProduct.revenue)} en ingresos`] : []}
            empty="Aún no hay ventas en el periodo"
          />
          <HighlightCard
            title="Menos vendido"
            icon={<TrendingDown className="w-4 h-4 text-orange-600" />}
            accent="bg-orange-50"
            product={worstProduct || null}
            lines={worstProduct ? [`${worstProduct.units} uds vendidas`, `${fmt(worstProduct.revenue)} en ingresos`] : []}
            empty="Sin productos activos"
          />
          <HighlightCard
            title="Más clickeado"
            icon={<MousePointerClick className="w-4 h-4 text-blue-600" />}
            accent="bg-blue-50"
            product={mostVisitedProduct}
            lines={mostVisitedProduct ? [`${mostVisited.visits} visitas a su página`, "Más interés que ninguno"] : []}
            empty="Sin visitas registradas todavía"
          />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-5">
          <p className="text-xs text-[#2D1A14]/50 font-semibold uppercase tracking-wider mb-3">Producto estrella</p>
          <p className="text-base font-bold text-[#2D1A14] truncate">{bestProduct?.name || "—"}</p>
          <p className="text-xs text-[#2D1A14]/40 mt-1">{bestProduct ? `${bestProduct.units} uds · ${fmt(bestProduct.revenue)}` : "Sin ventas"}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-5">
          <p className="text-xs text-[#2D1A14]/50 font-semibold uppercase tracking-wider mb-3">Menos ventas</p>
          <p className="text-base font-bold text-[#2D1A14] truncate">{worstProduct?.name || "—"}</p>
          <p className="text-xs text-[#2D1A14]/40 mt-1">{worstProduct ? `${worstProduct.units} uds · ${fmt(worstProduct.revenue)}` : "—"}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-5">
          <p className="text-xs text-[#2D1A14]/50 font-semibold uppercase tracking-wider mb-3">Stock en riesgo</p>
          <p className={`text-2xl font-bold ${atRisk.length > 0 ? "text-red-500" : "text-[#2D1A14]"}`}>{atRisk.length}</p>
          <p className="text-xs text-[#2D1A14]/40 mt-1">productos con 5 o menos</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-5">
          <p className="text-xs text-[#2D1A14]/50 font-semibold uppercase tracking-wider mb-3">Sin ventas</p>
          <p className={`text-2xl font-bold ${dormant.length > 0 ? "text-amber-600" : "text-[#2D1A14]"}`}>{dormant.length}</p>
          <p className="text-xs text-[#2D1A14]/40 mt-1">productos activos sin movimiento</p>
        </div>
      </div>

      {/* Product matrix table */}
      <div className="bg-white rounded-2xl border border-[#2D1A14]/8 overflow-hidden">
        <div className="px-5 py-4 border-b border-[#2D1A14]/8">
          <h3 className="text-sm font-semibold text-[#2D1A14]">Matriz de rendimiento</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2D1A14]/5">
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#2D1A14]/40 uppercase tracking-wide">Producto</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#2D1A14]/40 uppercase tracking-wide">Precio</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#2D1A14]/40 uppercase tracking-wide">Stock</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#2D1A14]/40 uppercase tracking-wide">Uds.</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#2D1A14]/40 uppercase tracking-wide">Ingresos</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#2D1A14]/40 uppercase tracking-wide">Velocidad</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-[#2D1A14]/40 uppercase tracking-wide">Tendencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2D1A14]/5">
              {productRows.map(p => (
                <tr key={p.id} className={`hover:bg-[#FAF8F5] transition-colors ${!p.is_active ? "opacity-40" : ""}`}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-[#2D1A14] truncate max-w-[200px]">{p.name}</p>
                    {p.stock <= 5 && p.is_active && (
                      <span className="text-[10px] font-semibold text-red-600">Stock bajo</span>
                    )}
                    {!p.is_active && (
                      <span className="text-[10px] font-semibold text-[#2D1A14]/30">Inactivo</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-[#2D1A14]/70 whitespace-nowrap">{fmt(p.price)}</td>
                  <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${p.stock <= 5 ? "text-red-500" : "text-[#2D1A14]"}`}>{p.stock}</td>
                  <td className="px-4 py-3 text-right text-[#2D1A14]/70">{p.units}</td>
                  <td className="px-4 py-3 text-right font-semibold text-[#2D1A14] whitespace-nowrap">{fmt(p.revenue)}</td>
                  <td className="px-4 py-3 text-right text-xs text-[#2D1A14]/50 whitespace-nowrap">{p.velocity.toFixed(2)} uds/día</td>
                  <td className="px-4 py-3 text-center">
                    {p.trend === "up" && <TrendingUp className="w-4 h-4 text-green-500 mx-auto" />}
                    {p.trend === "down" && <TrendingDown className="w-4 h-4 text-red-400 mx-auto" />}
                    {p.trend === "same" && <Minus className="w-4 h-4 text-[#2D1A14]/20 mx-auto" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Best sellers visual */}
      {productRows.filter(p => p.revenue > 0).length > 0 && (
        <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-5">
          <h3 className="text-sm font-semibold text-[#2D1A14] mb-4">Participación en ingresos</h3>
          <div className="space-y-3">
            {productRows.filter(p => p.revenue > 0).slice(0, 6).map(p => (
              <div key={p.id}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm text-[#2D1A14] truncate pr-4">{p.name}</p>
                  <p className="text-xs font-semibold text-[#2D1A14]/60 whitespace-nowrap">{((p.revenue / totalRevenue) * 100).toFixed(1)}%</p>
                </div>
                <div className="h-2 bg-[#2D1A14]/8 rounded-full overflow-hidden">
                  <div className="h-full bg-[#A67163] rounded-full" style={{ width: `${(p.revenue / totalRevenue) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* At-risk & dormant */}
      {atRisk.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-semibold text-red-800">Productos con stock crítico</h3>
          </div>
          <div className="space-y-2">
            {atRisk.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-red-100">
                <p className="text-sm font-medium text-[#2D1A14]">{p.name}</p>
                <span className="text-xs font-bold text-red-600">{p.stock} {p.stock === 1 ? "unidad" : "unidades"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {dormant.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-amber-700" />
            <h3 className="text-sm font-semibold text-amber-800">Productos dormidos (0 ventas en el periodo)</h3>
          </div>
          <div className="space-y-2">
            {dormant.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-amber-100">
                <p className="text-sm font-medium text-[#2D1A14]">{p.name}</p>
                <span className="text-xs text-amber-700">Stock: {p.stock}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
