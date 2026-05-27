"use client"
import { useState } from "react"
import { DollarSign, ShoppingBag, BarChart3, Tag, TrendingUp, TrendingDown, Info } from "lucide-react"
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Order, Period, CONFIRMED, filterPeriod, filterPrevPeriod, pctChange, fmt, buildDailyData, PERIOD_DAYS } from "../types"
import { PeriodSelector } from "../components/period-selector"
import { StatCard } from "../components/stat-card"
import type { Product } from "@/lib/supabase"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CurrencyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-[#2D1A14]/10 rounded-xl shadow-lg px-4 py-3">
      <p className="text-xs text-[#2D1A14]/50 mb-2">{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any) => (
        <p key={p.name} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name === "Ingresos" || p.name === "Ingresos anteriores" ? fmt(p.value) : `${p.value} ${p.name}`}
        </p>
      ))}
    </div>
  )
}

function MiniBar({ value, max, color = "bg-[#A67163]" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="h-1.5 bg-[#2D1A14]/8 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function VentasSection({ orders, products }: { orders: Order[]; products: Product[] }) {
  const [period, setPeriod] = useState<Period>("1m")
  const [compare, setCompare] = useState(false)

  const curr = filterPeriod(orders, period).filter(o => CONFIRMED.includes(o.status))
  const prev = filterPrevPeriod(orders, period).filter(o => CONFIRMED.includes(o.status))

  const revenue = curr.reduce((s, o) => s + o.total, 0)
  const prevRevenue = prev.reduce((s, o) => s + o.total, 0)
  const aov = curr.length > 0 ? revenue / curr.length : 0
  const prevAov = prev.length > 0 ? prevRevenue / prev.length : 0
  const totalDiscounts = curr.reduce((s, o) => s + (o.discount_amount || 0), 0)
  const prevDiscounts = prev.reduce((s, o) => s + (o.discount_amount || 0), 0)

  // Build chart data (current period)
  const chartData = buildDailyData(orders, [], period)

  // Build previous period chart data for overlay
  const prevChartData = (() => {
    const days = PERIOD_DAYS[period]
    const granularity = days <= 30 ? 1 : days <= 90 ? 7 : 30
    const result: Array<{ label: string; revenue: number }> = []
    for (let i = days - 1; i >= 0; i -= granularity) {
      const to = new Date(Date.now() - (days + i) * 86400000)
      const from = new Date(Date.now() - (days + Math.min(i + granularity - 1, days - 1)) * 86400000)
      const fromStr = from.toISOString().slice(0, 10)
      const toStr = to.toISOString().slice(0, 10)
      const periodOrders = orders.filter(o => {
        const d = o.created_at.slice(0, 10)
        return d >= fromStr && d <= toStr && CONFIRMED.includes(o.status)
      })
      const label = granularity === 1
        ? to.toLocaleDateString("es-CO", { month: "short", day: "numeric" })
        : `${from.toLocaleDateString("es-CO", { month: "short", day: "numeric" })} – ${to.toLocaleDateString("es-CO", { day: "numeric" })}`
      result.push({ label, revenue: periodOrders.reduce((s, o) => s + o.total, 0) })
    }
    return result
  })()

  // Merge chart data
  const mergedChart = chartData.map((d, i) => ({
    ...d,
    prevRevenue: prevChartData[i]?.revenue ?? 0,
  }))

  // Product stats
  const productStats: Record<string, { name: string; units: number; revenue: number; price: number }> = {}
  for (const o of curr) {
    for (const item of o.items || []) {
      const k = item.product_id
      if (!productStats[k]) productStats[k] = { name: item.name || k, units: 0, revenue: 0, price: item.price || 0 }
      productStats[k].units += item.quantity
      productStats[k].revenue += (item.price || 0) * item.quantity
    }
  }
  const sorted = Object.values(productStats).sort((a, b) => b.revenue - a.revenue)
  const topProducts = sorted.slice(0, 5)
  const worstProducts = sorted.slice(-3).reverse()
  const totalRevenue = topProducts.reduce((s, p) => s + p.revenue, 0) || 1
  const zeroSales = products.filter(p => !productStats[p.id] && p.is_active)

  // Dynamic analysis text
  const trend = pctChange(revenue, prevRevenue)
  const analysisText = trend === null
    ? `En este periodo se generaron ${fmt(revenue)} en ingresos con ${curr.length} pedidos confirmados.`
    : trend > 0
      ? `Las ventas crecieron ${trend.toFixed(1)}% respecto al periodo anterior, generando ${fmt(revenue)} en ingresos.${topProducts[0] ? ` El producto estrella fue "${topProducts[0].name}" con ${topProducts[0].units} unidades vendidas.` : ""}`
      : `Las ventas cayeron ${Math.abs(trend).toFixed(1)}% respecto al periodo anterior.${worstProducts.length > 0 ? ` Productos como "${worstProducts[0].name}" necesitan atención.` : ""}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#2D1A14]">Ventas</h2>
          <p className="text-sm text-[#2D1A14]/50 mt-0.5">Análisis detallado de ingresos y productos</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setCompare(!compare)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${compare ? "bg-[#2D1A14] text-white border-[#2D1A14]" : "bg-white text-[#2D1A14]/60 border-[#2D1A14]/15 hover:border-[#2D1A14]/30"}`}
          >
            {compare ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
            {compare ? "Ocultar comparación" : "Comparar periodo anterior"}
          </button>
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
      </div>

      {/* Analysis insight */}
      <div className="bg-[#A67163]/8 border border-[#A67163]/20 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-[#A67163] mt-0.5 flex-shrink-0" />
        <p className="text-sm text-[#2D1A14]/80">{analysisText}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Ingresos" value={fmt(revenue)} icon={DollarSign} iconColor="text-green-600" change={pctChange(revenue, prevRevenue)} />
        <StatCard label="Pedidos" value={curr.length} icon={ShoppingBag} iconColor="text-blue-600" change={pctChange(curr.length, prev.length)} />
        <StatCard label="Ticket promedio" value={aov > 0 ? fmt(aov) : "—"} icon={BarChart3} iconColor="text-[#A67163]" change={pctChange(aov, prevAov)} />
        <StatCard label="Descuentos" value={fmt(totalDiscounts)} icon={Tag} iconColor="text-amber-600" change={pctChange(totalDiscounts, prevDiscounts)} />
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-5">
        <h3 className="text-sm font-semibold text-[#2D1A14] mb-5">Ingresos por día</h3>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={mergedChart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="colorRevV" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#A67163" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#A67163" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorPrevV" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#9ca3af" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2D1A14" strokeOpacity={0.05} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#2D1A14", opacity: 0.4 }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: "#2D1A14", opacity: 0.4 }} tickLine={false} axisLine={false} />
            <Tooltip content={<CurrencyTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
            <Area type="monotone" dataKey="revenue" name="Ingresos" stroke="#A67163" strokeWidth={2} fill="url(#colorRevV)" />
            {compare && <Area type="monotone" dataKey="prevRevenue" name="Ingresos anteriores" stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="4 2" fill="url(#colorPrevV)" />}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Orders per day bar chart */}
      <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-5">
        <h3 className="text-sm font-semibold text-[#2D1A14] mb-5">Pedidos por día</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={mergedChart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2D1A14" strokeOpacity={0.05} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#2D1A14", opacity: 0.4 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#2D1A14", opacity: 0.4 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<CurrencyTooltip />} />
            <Bar dataKey="orders" name="Pedidos" fill="#A67163" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Best performers */}
      <div className="bg-white rounded-2xl border border-[#2D1A14]/8 overflow-hidden">
        <div className="px-5 py-4 border-b border-[#2D1A14]/8">
          <h3 className="text-sm font-semibold text-[#2D1A14]">Mejores productos</h3>
          <p className="text-xs text-[#2D1A14]/40 mt-0.5">Por ingresos en el periodo seleccionado</p>
        </div>
        {topProducts.length === 0 ? (
          <p className="p-6 text-sm text-[#2D1A14]/40 text-center">Sin ventas en el periodo</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2D1A14]/5">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#2D1A14]/40 uppercase tracking-wide">Producto</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-[#2D1A14]/40 uppercase tracking-wide">Unidades</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-[#2D1A14]/40 uppercase tracking-wide">Precio prom.</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-[#2D1A14]/40 uppercase tracking-wide">Ingresos</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-[#2D1A14]/40 uppercase tracking-wide">% total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D1A14]/5">
                {topProducts.map((p, i) => (
                  <tr key={i} className="hover:bg-[#FAF8F5] transition-colors">
                    <td className="px-5 py-3 font-medium text-[#2D1A14]">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#A67163]/15 flex items-center justify-center text-[10px] font-bold text-[#A67163]">{i + 1}</span>
                        {p.name}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-[#2D1A14]/70">{p.units}</td>
                    <td className="px-5 py-3 text-right text-[#2D1A14]/70">{p.units > 0 ? fmt(p.revenue / p.units) : "—"}</td>
                    <td className="px-5 py-3 text-right font-semibold text-[#2D1A14]">{fmt(p.revenue)}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-[#2D1A14]/8 rounded-full overflow-hidden">
                          <div className="h-full bg-[#A67163] rounded-full" style={{ width: `${(p.revenue / totalRevenue) * 100}%` }} />
                        </div>
                        <span className="text-xs text-[#2D1A14]/50 w-8 text-right">{((p.revenue / totalRevenue) * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Worst / dormant products */}
      {(worstProducts.length > 0 || zeroSales.length > 0) && (
        <div className="bg-white rounded-2xl border border-[#2D1A14]/8 overflow-hidden">
          <div className="px-5 py-4 border-b border-[#2D1A14]/8">
            <h3 className="text-sm font-semibold text-[#2D1A14]">Productos con bajo rendimiento</h3>
            <p className="text-xs text-[#2D1A14]/40 mt-0.5">Requieren atención o estrategia</p>
          </div>
          <div className="divide-y divide-[#2D1A14]/5">
            {worstProducts.map((p, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <p className="text-sm text-[#2D1A14]">{p.name}</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#2D1A14]/50">{p.units} uds · {fmt(p.revenue)}</span>
                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Bajo</span>
                </div>
              </div>
            ))}
            {zeroSales.slice(0, 3).map(p => (
              <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                <p className="text-sm text-[#2D1A14]">{p.name}</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#2D1A14]/50">0 uds vendidas</span>
                  <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">Sin ventas</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
