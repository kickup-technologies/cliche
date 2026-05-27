"use client"
import { useState } from "react"
import { Users, TrendingUp, Eye, ShoppingBag, Info } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Order, PageView, Period, CONFIRMED, filterPeriod, filterPrevPeriod, pctChange, buildDailyData, PERIOD_DAYS } from "../types"
import { PeriodSelector } from "../components/period-selector"
import { StatCard } from "../components/stat-card"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ViewsTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-[#2D1A14]/10 rounded-xl shadow-lg px-4 py-3">
      <p className="text-xs text-[#2D1A14]/50 mb-2">{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any) => (
        <p key={p.name} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.value} {p.name}
        </p>
      ))}
    </div>
  )
}

export function TraficoSection({ orders, pageViews }: { orders: Order[]; pageViews: PageView[] }) {
  const [period, setPeriod] = useState<Period>("1m")
  const [compare, setCompare] = useState(false)

  const curr = filterPeriod(orders, period).filter(o => CONFIRMED.includes(o.status))
  const currViews = filterPeriod(pageViews, period)
  const prevViews = filterPrevPeriod(pageViews, period)

  const convRate = currViews.length > 0 ? (curr.length / currViews.length * 100) : 0
  const checkoutViews = currViews.filter(v => v.path.includes("checkout")).length
  const checkoutRate = currViews.length > 0 ? (checkoutViews / currViews.length * 100) : 0
  const orderRate = checkoutViews > 0 ? (curr.length / checkoutViews * 100) : 0

  // Build chart data
  const chartData = buildDailyData(orders, pageViews, period)

  // Previous period views data
  const prevChartData = (() => {
    const days = PERIOD_DAYS[period]
    const granularity = days <= 30 ? 1 : days <= 90 ? 7 : 30
    const result: Array<{ label: string; views: number }> = []
    for (let i = days - 1; i >= 0; i -= granularity) {
      const to = new Date(Date.now() - (days + i) * 86400000)
      const from = new Date(Date.now() - (days + Math.min(i + granularity - 1, days - 1)) * 86400000)
      const fromStr = from.toISOString().slice(0, 10)
      const toStr = to.toISOString().slice(0, 10)
      const periodViews = pageViews.filter(v => {
        const d = v.created_at.slice(0, 10)
        return d >= fromStr && d <= toStr
      })
      const label = granularity === 1
        ? to.toLocaleDateString("es-CO", { month: "short", day: "numeric" })
        : `${from.toLocaleDateString("es-CO", { month: "short", day: "numeric" })} – ${to.toLocaleDateString("es-CO", { day: "numeric" })}`
      result.push({ label, views: periodViews.length })
    }
    return result
  })()

  const mergedChart = chartData.map((d, i) => ({
    ...d,
    prevViews: prevChartData[i]?.views ?? 0,
  }))

  // Top pages
  const pageCounts: Record<string, number> = {}
  for (const v of currViews) pageCounts[v.path] = (pageCounts[v.path] || 0) + 1
  const topPages = Object.entries(pageCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const maxPage = topPages[0]?.[1] || 1

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#2D1A14]">Tráfico</h2>
          <p className="text-sm text-[#2D1A14]/50 mt-0.5">Visitas, páginas y embudo de conversión</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setCompare(!compare)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${compare ? "bg-[#2D1A14] text-white border-[#2D1A14]" : "bg-white text-[#2D1A14]/60 border-[#2D1A14]/15 hover:border-[#2D1A14]/30"}`}
          >
            <TrendingUp className="w-3 h-3" />
            {compare ? "Ocultar comparación" : "Comparar"}
          </button>
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Visitas totales" value={currViews.length.toLocaleString("es-CO")} icon={Eye} iconColor="text-blue-600" change={pctChange(currViews.length, prevViews.length)} />
        <StatCard label="Pedidos" value={curr.length} icon={ShoppingBag} iconColor="text-[#A67163]" change={pctChange(curr.length, filterPrevPeriod(orders, period).filter(o => CONFIRMED.includes(o.status)).length)} />
        <StatCard label="Conversión" value={`${convRate.toFixed(1)}%`} sub="visitas → pedidos" icon={TrendingUp} iconColor="text-green-600" />
        <StatCard label="Llegan al checkout" value={`${checkoutRate.toFixed(1)}%`} sub={`${checkoutViews} sesiones`} icon={Users} iconColor="text-purple-600" />
      </div>

      {/* Views chart */}
      <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-5">
        <h3 className="text-sm font-semibold text-[#2D1A14] mb-5">Visitas por día</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={mergedChart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2D1A14" strokeOpacity={0.05} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#2D1A14", opacity: 0.4 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#2D1A14", opacity: 0.4 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<ViewsTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
            <Line type="monotone" dataKey="views" name="Visitas" stroke="#6366f1" strokeWidth={2} dot={false} />
            {compare && <Line type="monotone" dataKey="prevViews" name="Visitas anteriores" stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Conversion funnel */}
      <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-5">
        <h3 className="text-sm font-semibold text-[#2D1A14] mb-5">Embudo de conversión</h3>
        <div className="space-y-3">
          {[
            { label: "Visitas a la tienda", value: currViews.length, pct: 100, color: "bg-blue-400" },
            { label: "Llegan al checkout", value: checkoutViews, pct: checkoutRate, color: "bg-[#A67163]" },
            { label: "Pedidos confirmados", value: curr.length, pct: orderRate, color: "bg-green-500" },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-6 h-6 rounded-full bg-[#2D1A14]/8 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-[#2D1A14]/50">{i + 1}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm text-[#2D1A14] font-medium">{step.label}</p>
                  <p className="text-sm font-bold text-[#2D1A14]">{step.value.toLocaleString("es-CO")}</p>
                </div>
                <div className="h-2 bg-[#2D1A14]/8 rounded-full overflow-hidden">
                  <div className={`h-full ${step.color} rounded-full transition-all`} style={{ width: `${Math.min(step.pct, 100)}%` }} />
                </div>
                {i > 0 && (
                  <p className="text-xs text-[#2D1A14]/40 mt-1">{step.pct.toFixed(1)}% del paso anterior</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top pages */}
      <div className="bg-white rounded-2xl border border-[#2D1A14]/8 overflow-hidden">
        <div className="px-5 py-4 border-b border-[#2D1A14]/8">
          <h3 className="text-sm font-semibold text-[#2D1A14]">Páginas más visitadas</h3>
        </div>
        {topPages.length === 0 ? (
          <div className="p-6 text-center">
            <Info className="w-8 h-8 text-[#2D1A14]/15 mx-auto mb-2" />
            <p className="text-sm text-[#2D1A14]/40">Sin datos de tráfico en este periodo</p>
          </div>
        ) : (
          <div className="divide-y divide-[#2D1A14]/5">
            {topPages.map(([path, count]) => (
              <div key={path} className="px-5 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm text-[#2D1A14] font-mono truncate pr-4">{path}</p>
                  <p className="text-xs font-semibold text-[#2D1A14] whitespace-nowrap">{count.toLocaleString("es-CO")} visitas</p>
                </div>
                <div className="h-1.5 bg-[#2D1A14]/8 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(count / maxPage) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
