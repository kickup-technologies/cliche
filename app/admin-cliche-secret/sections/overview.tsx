"use client"
import { useState } from "react"
import { DollarSign, ShoppingBag, BarChart3, Users, Star, MapPin, Tag } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Order, PageView, Period, CONFIRMED, filterPeriod, filterPrevPeriod, pctChange, fmt, buildDailyData, ORDER_STATUS_MAP } from "../types"
import { PeriodSelector } from "../components/period-selector"
import { StatCard } from "../components/stat-card"
import type { Product } from "@/lib/supabase"

function MiniBar({ value, max, color = "bg-[#A67163]" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="h-1.5 bg-[#2D1A14]/8 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CurrencyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-[#2D1A14]/10 rounded-xl shadow-lg px-4 py-3">
      <p className="text-xs text-[#2D1A14]/50 mb-2">{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any) => (
        <p key={p.name} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name === "Ingresos" ? fmt(p.value) : `${p.value} ${p.name}`}
        </p>
      ))}
    </div>
  )
}

export function OverviewSection({ orders, pageViews, products }: { orders: Order[]; pageViews: PageView[]; products: Product[] }) {
  const [period, setPeriod] = useState<Period>("1m")

  const curr = filterPeriod(orders, period).filter(o => CONFIRMED.includes(o.status))
  const prev = filterPrevPeriod(orders, period).filter(o => CONFIRMED.includes(o.status))
  const currViews = filterPeriod(pageViews, period)
  const prevViews = filterPrevPeriod(pageViews, period)

  const revenue = curr.reduce((s, o) => s + o.total, 0)
  const prevRevenue = prev.reduce((s, o) => s + o.total, 0)
  const aov = curr.length > 0 ? revenue / curr.length : 0
  const prevAov = prev.length > 0 ? prevRevenue / prev.length : 0
  const convRate = currViews.length > 0 ? (curr.length / currViews.length * 100) : 0

  const chartData = buildDailyData(orders, pageViews, period)

  // Top products
  const productSales: Record<string, { name: string; units: number; revenue: number }> = {}
  for (const o of curr) {
    for (const item of o.items || []) {
      const k = item.product_id || item.name || "otros"
      if (!productSales[k]) productSales[k] = { name: item.name || k, units: 0, revenue: 0 }
      productSales[k].units += item.quantity
      productSales[k].revenue += (item.price || 0) * item.quantity
    }
  }
  const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  const maxRevenue = topProducts[0]?.revenue || 1

  // Top cities
  const cities: Record<string, number> = {}
  for (const o of curr) {
    const city = o.shipping_address?.city
    if (city) cities[city] = (cities[city] || 0) + 1
  }
  const topCities = Object.entries(cities).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const maxCity = topCities[0]?.[1] || 1

  // Discount codes
  const codeCounts: Record<string, { uses: number; savings: number }> = {}
  for (const o of curr) {
    if (o.discount_code) {
      if (!codeCounts[o.discount_code]) codeCounts[o.discount_code] = { uses: 0, savings: 0 }
      codeCounts[o.discount_code].uses++
      codeCounts[o.discount_code].savings += o.discount_amount || 0
    }
  }
  const topCodes = Object.entries(codeCounts).sort((a, b) => b[1].uses - a[1].uses).slice(0, 5)

  // Status breakdown
  const statusCounts: Record<string, number> = {}
  for (const o of filterPeriod(orders, period)) {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#2D1A14]">Resumen General</h2>
          <p className="text-sm text-[#2D1A14]/50 mt-0.5">Vista completa del rendimiento del negocio</p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Ingresos" value={fmt(revenue)} icon={DollarSign} iconColor="text-green-600" change={pctChange(revenue, prevRevenue)} />
        <StatCard label="Pedidos" value={curr.length} icon={ShoppingBag} iconColor="text-blue-600" change={pctChange(curr.length, prev.length)} />
        <StatCard label="Ticket promedio" value={aov > 0 ? fmt(aov) : "—"} sub="por pedido confirmado" icon={BarChart3} iconColor="text-[#A67163]" change={pctChange(aov, prevAov)} />
        <StatCard label="Visitas" value={currViews.length.toLocaleString("es-CO")} sub={`${convRate.toFixed(1)}% conversión`} icon={Users} iconColor="text-purple-600" change={pctChange(currViews.length, prevViews.length)} />
      </div>

      {/* Revenue + Orders chart */}
      <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-5">
        <h3 className="text-sm font-semibold text-[#2D1A14] mb-5">Ingresos y pedidos en el periodo</h3>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="colorRevOv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#A67163" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#A67163" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorOrdOv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2D1A14" strokeOpacity={0.05} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#2D1A14", opacity: 0.4 }} tickLine={false} axisLine={false} />
            <YAxis yAxisId="revenue" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: "#2D1A14", opacity: 0.4 }} tickLine={false} axisLine={false} />
            <YAxis yAxisId="orders" orientation="right" tick={{ fontSize: 10, fill: "#2D1A14", opacity: 0.4 }} tickLine={false} axisLine={false} />
            <Tooltip content={<CurrencyTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
            <Area yAxisId="revenue" type="monotone" dataKey="revenue" name="Ingresos" stroke="#A67163" strokeWidth={2} fill="url(#colorRevOv)" />
            <Area yAxisId="orders" type="monotone" dataKey="orders" name="Pedidos" stroke="#6366f1" strokeWidth={2} fill="url(#colorOrdOv)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-5">
          <p className="text-xs text-[#2D1A14]/50 font-semibold uppercase tracking-wider mb-3">Productos activos</p>
          <p className="text-2xl font-bold text-[#2D1A14]">{products.filter(p => p.is_active).length}</p>
          <p className="text-xs text-[#2D1A14]/40 mt-1">de {products.length} totales</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-5">
          <p className="text-xs text-[#2D1A14]/50 font-semibold uppercase tracking-wider mb-3">Stock bajo</p>
          <p className={`text-2xl font-bold ${products.filter(p => p.stock <= 5).length > 0 ? "text-red-500" : "text-[#2D1A14]"}`}>
            {products.filter(p => p.stock <= 5).length}
          </p>
          <p className="text-xs text-[#2D1A14]/40 mt-1">con 5 o menos unidades</p>
        </div>
        {/* Antes esta tarjeta contaba "pending", pero /api/admin/data ya no los
            envía (siempre daba 0). Lo accionable es lo contrario: pedidos ya
            PAGADOS que aún no se han despachado. */}
        <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-5">
          <p className="text-xs text-[#2D1A14]/50 font-semibold uppercase tracking-wider mb-3">Por despachar</p>
          <p className={`text-2xl font-bold ${((statusCounts["paid"] || 0) + (statusCounts["confirmed"] || 0) + (statusCounts["preparing"] || 0)) > 0 ? "text-yellow-600" : "text-[#2D1A14]"}`}>
            {(statusCounts["paid"] || 0) + (statusCounts["confirmed"] || 0) + (statusCounts["preparing"] || 0)}
          </p>
          <p className="text-xs text-[#2D1A14]/40 mt-1">pedidos pagados sin enviar</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-5">
          <p className="text-xs text-[#2D1A14]/50 font-semibold uppercase tracking-wider mb-3">Descuentos otorgados</p>
          <p className="text-2xl font-bold text-[#2D1A14]">{fmt(curr.reduce((s, o) => s + (o.discount_amount || 0), 0))}</p>
          <p className="text-xs text-[#2D1A14]/40 mt-1">en el periodo</p>
        </div>
      </div>

      {/* Status breakdown */}
      <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-5">
        <h3 className="text-sm font-semibold text-[#2D1A14] mb-4">Estado de pedidos en el periodo</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(ORDER_STATUS_MAP)
            // "pending" no llega al payload del admin (son intentos sin pagar),
            // así que su celda sería estructuralmente 0: se omite del desglose.
            // "cancelled" y "paid" sí se muestran para que ningún pedido real
            // quede fuera de los contadores.
            .filter(([key]) => key !== "pending")
            .map(([key, st]) => (
              <div key={key} className={`rounded-xl border px-4 py-3 ${st.bg} ${st.border}`}>
                <p className={`text-xl font-bold ${st.color}`}>{statusCounts[key] || 0}</p>
                <p className={`text-xs font-medium mt-0.5 ${st.color}`}>{st.label}</p>
              </div>
            ))}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top products */}
        <div className="bg-white rounded-2xl border border-[#2D1A14]/8 overflow-hidden">
          <div className="px-5 py-4 border-b border-[#2D1A14]/8 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#2D1A14]">Productos más vendidos</h3>
            <Star className="w-4 h-4 text-[#A67163]" />
          </div>
          <div className="divide-y divide-[#2D1A14]/5">
            {topProducts.length === 0 ? (
              <p className="p-5 text-sm text-[#2D1A14]/40 text-center">Sin ventas en el periodo</p>
            ) : topProducts.map((p, i) => (
              <div key={i} className="px-5 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm text-[#2D1A14] font-medium truncate pr-2">{p.name}</p>
                  <p className="text-xs font-semibold text-[#2D1A14] whitespace-nowrap">{p.units} u.</p>
                </div>
                <div className="flex items-center gap-2">
                  <MiniBar value={p.revenue} max={maxRevenue} />
                  <p className="text-xs text-[#2D1A14]/50 whitespace-nowrap">{fmt(p.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top cities */}
        <div className="bg-white rounded-2xl border border-[#2D1A14]/8 overflow-hidden">
          <div className="px-5 py-4 border-b border-[#2D1A14]/8 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#2D1A14]">Ciudades con más envíos</h3>
            <MapPin className="w-4 h-4 text-[#A67163]" />
          </div>
          <div className="divide-y divide-[#2D1A14]/5">
            {topCities.length === 0 ? (
              <p className="p-5 text-sm text-[#2D1A14]/40 text-center">Sin datos de envío</p>
            ) : topCities.map(([city, count]) => (
              <div key={city} className="px-5 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm text-[#2D1A14] font-medium">{city}</p>
                  <p className="text-xs font-semibold text-[#2D1A14]">{count} pedidos</p>
                </div>
                <MiniBar value={count} max={maxCity} color="bg-purple-400" />
              </div>
            ))}
          </div>
        </div>

        {/* Discount codes */}
        <div className="bg-white rounded-2xl border border-[#2D1A14]/8 overflow-hidden">
          <div className="px-5 py-4 border-b border-[#2D1A14]/8 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#2D1A14]">Códigos de descuento</h3>
            <Tag className="w-4 h-4 text-[#A67163]" />
          </div>
          <div className="divide-y divide-[#2D1A14]/5">
            {topCodes.length === 0 ? (
              <p className="p-5 text-sm text-[#2D1A14]/40 text-center">Sin códigos usados</p>
            ) : topCodes.map(([code, data]) => (
              <div key={code} className="px-5 py-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-mono font-bold text-[#2D1A14]">{code}</p>
                  <p className="text-xs text-[#2D1A14]/40">{data.uses} usos · {fmt(data.savings)} ahorrados</p>
                </div>
                <span className="text-xs font-semibold text-[#A67163] bg-[#A67163]/10 px-2 py-0.5 rounded-full">{data.uses}x</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
