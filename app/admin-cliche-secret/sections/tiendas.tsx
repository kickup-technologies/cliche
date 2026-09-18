"use client"

/**
 * Multi-tienda: vista en vivo de la tienda hermana (Bienestar) y comparador
 * lado a lado. Los datos llegan normalizados a la forma común (PeerSummary)
 * desde /api/admin/peer (?self=1 para el resumen local del comparador).
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { RefreshCw, AlertCircle, ExternalLink, Package, ShoppingBag, TrendingUp, Mail } from "lucide-react"
import { adminFetch } from "@/lib/admin-client"
import type { PeerSummary, PeerOrder } from "@/lib/peer"

const fmt = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n)

type Period = "7d" | "1m" | "3m" | "all"
const PERIOD_MS: Record<Period, number> = { "7d": 7 * 864e5, "1m": 30 * 864e5, "3m": 90 * 864e5, all: Number.POSITIVE_INFINITY }

function filterPeriod(rows: PeerOrder[], period: Period, offset = 0): PeerOrder[] {
  if (period === "all") return offset === 0 ? rows : []
  const ms = PERIOD_MS[period]
  const hi = Date.now() - offset * ms
  const lo = hi - ms
  return rows.filter(r => { const t = new Date(r.created_at).getTime(); return t > lo && t <= hi })
}

const pct = (curr: number, prev: number): number | null => (prev === 0 ? null : ((curr - prev) / prev) * 100)

function metrics(s: PeerSummary, period: Period) {
  const confirmed = (s.orders || []).filter(o => o.confirmed)
  const curr = filterPeriod(confirmed, period)
  const prev = filterPeriod(confirmed, period, 1)
  const revenue = curr.reduce((a, o) => a + (o.total || 0), 0)
  const prevRevenue = prev.reduce((a, o) => a + (o.total || 0), 0)
  const aov = curr.length ? revenue / curr.length : 0
  const prevAov = prev.length ? prevRevenue / prev.length : 0
  const top = (() => {
    const map = new Map<string, { name: string; qty: number }>()
    for (const o of curr) for (const it of o.items || []) {
      const c = map.get(it.name) || { name: it.name, qty: 0 }
      c.qty += it.qty; map.set(it.name, c)
    }
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 6)
  })()
  const clientes = new Set(confirmed.map(o => (o.email || o.phone || o.customer_name || "").toLowerCase())).size
  const activos = (s.products || []).filter(p => p.active).length
  return { curr, prev, revenue, prevRevenue, aov, prevAov, top, clientes, activos }
}

function PeriodTabs({ period, onChange }: { period: Period; onChange: (p: Period) => void }) {
  const opts: { id: Period; label: string }[] = [
    { id: "7d", label: "7 días" }, { id: "1m", label: "30 días" }, { id: "3m", label: "90 días" }, { id: "all", label: "Todo" },
  ]
  return (
    <div className="flex gap-1 bg-white border border-[#2D1A14]/10 rounded-xl p-1">
      {opts.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${period === o.id ? "bg-[#A67163] text-white" : "text-[#2D1A14]/60 hover:bg-[#2D1A14]/5"}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Card({ label, value, sub, change }: { label: string; value: string | number; sub?: string; change?: number | null }) {
  return (
    <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-5">
      <p className="text-xs text-[#2D1A14]/50 font-semibold uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-bold text-[#2D1A14] leading-none">{value}</p>
      {sub && <p className="text-xs text-[#2D1A14]/40 mt-1.5">{sub}</p>}
      {change !== undefined && change !== null && (
        <p className={`mt-2 text-xs font-semibold ${change >= 0 ? "text-green-600" : "text-red-500"}`}>
          {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(1)}% vs periodo anterior
        </p>
      )}
    </div>
  )
}

const BIENESTAR_ACCENT = "#6E7A6D"
const CLICHE_ACCENT = "#A67163"

function useSummary(url: string) {
  const [data, setData] = useState<PeerSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const load = useCallback(async (fresh = false) => {
    setLoading(true); setError("")
    try {
      const r = await adminFetch(`${url}${fresh && !url.includes("?") ? "?fresh=1" : ""}`)
      const d = await r.json().catch(() => null)
      if (!r.ok || !d) throw new Error(d?.error || `Error ${r.status}`)
      setData(d)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión")
    } finally { setLoading(false) }
  }, [url])
  useEffect(() => { void load() }, [load])
  return { data, loading, error, load }
}

function Retry({ error, onRetry, what }: { error: string; onRetry: () => void; what: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-8 text-center">
      <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
      <p className="text-sm font-semibold text-[#2D1A14] mb-1">No se pudo cargar {what}</p>
      <p className="text-xs text-[#2D1A14]/50 mb-4">{error}</p>
      <button onClick={onRetry} className="text-xs font-semibold bg-[#A67163] text-white rounded-xl px-4 py-2">Reintentar</button>
    </div>
  )
}

/** Vista en vivo (solo lectura) de Bienestar dentro del panel de Cliché. */
export function BienestarSection() {
  const [period, setPeriod] = useState<Period>("1m")
  const { data, loading, error, load } = useSummary("/api/admin/peer")
  const m = useMemo(() => (data ? metrics(data, period) : null), [data, period])

  if (loading && !data) return <div className="py-24 grid place-items-center"><RefreshCw className="w-6 h-6 animate-spin text-[#A67163]" /></div>
  if (!data || !m) return <Retry error={error || "Sin conexión aún."} onRetry={() => void load(true)} what="la tienda Bienestar" />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-[#2D1A14]/50">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: BIENESTAR_ACCENT }} />
          Datos en vivo de <strong className="text-[#2D1A14]">{data.name}</strong> · solo lectura
          <a href={data.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#A67163] font-semibold hover:underline">
            abrir tienda <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <PeriodTabs period={period} onChange={setPeriod} />
          <button onClick={() => void load(true)} className="p-2 bg-white border border-[#2D1A14]/10 rounded-xl hover:bg-[#2D1A14]/5" aria-label="Actualizar">
            <RefreshCw className={`w-4 h-4 text-[#2D1A14] ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card label="Ingresos" value={fmt(m.revenue)} change={pct(m.revenue, m.prevRevenue)} />
        <Card label="Pedidos" value={m.curr.length} change={pct(m.curr.length, m.prev.length)} />
        <Card label="Ticket promedio" value={fmt(m.aov)} change={pct(m.aov, m.prevAov)} />
        <Card label="Suscriptores" value={data.subscribers_count} sub="newsletter (total)" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-5">
          <p className="text-xs text-[#2D1A14]/50 font-semibold uppercase tracking-wider mb-4">Top productos del periodo</p>
          {m.top.length === 0 ? <p className="text-sm text-[#2D1A14]/40">Sin ventas en el periodo.</p> : (
            <div className="space-y-3">
              {m.top.map(p => (
                <div key={p.name}>
                  <div className="flex justify-between text-sm mb-1"><span className="text-[#2D1A14]">{p.name}</span><span className="text-[#2D1A14]/50">{p.qty} uds</span></div>
                  <div className="h-1.5 bg-[#2D1A14]/8 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(p.qty / m.top[0].qty) * 100}%`, background: BIENESTAR_ACCENT }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-5">
          <p className="text-xs text-[#2D1A14]/50 font-semibold uppercase tracking-wider mb-4">Catálogo y clientes</p>
          <ul className="text-sm text-[#2D1A14]/70 space-y-2">
            <li className="flex items-center gap-2"><Package className="w-4 h-4 text-[#A67163]" /> {m.activos} productos visibles ({(data.products || []).length} en total)</li>
            <li className="flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-[#A67163]" /> {(data.orders || []).filter(o => o.confirmed).length} pedidos confirmados (histórico reciente)</li>
            <li className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[#A67163]" /> {m.clientes} clientes únicos con compra</li>
            <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-[#A67163]" /> {data.subscribers_count} correos en el newsletter</li>
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#2D1A14]/8 overflow-x-auto">
        <p className="text-xs text-[#2D1A14]/50 font-semibold uppercase tracking-wider px-4 pt-4">Pedidos recientes</p>
        <table className="w-full text-sm min-w-[720px]">
          <thead><tr className="text-left text-[10px] uppercase tracking-wider text-[#2D1A14]/45 border-b border-[#2D1A14]/8">
            <th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Ciudad</th><th className="px-4 py-3">Items</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Estado</th>
          </tr></thead>
          <tbody>
            {(data.orders || []).slice(0, 40).map(o => (
              <tr key={o.id} className="border-b border-[#2D1A14]/5 last:border-0 align-top">
                <td className="px-4 py-2.5 whitespace-nowrap text-[#2D1A14]/60">{new Date(o.created_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}</td>
                <td className="px-4 py-2.5 text-[#2D1A14]">{o.customer_name}<br /><small className="text-[#2D1A14]/45">{o.phone || ""}{o.email ? ` · ${o.email}` : ""}</small></td>
                <td className="px-4 py-2.5">{o.city || "—"}</td>
                <td className="px-4 py-2.5 max-w-56">{(o.items || []).map(i => `${i.qty}× ${i.name}`).join(", ")}</td>
                <td className="px-4 py-2.5 font-semibold whitespace-nowrap">{fmt(o.total)}</td>
                <td className="px-4 py-2.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${o.confirmed ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{o.status_label}</span>
                </td>
              </tr>
            ))}
            {(data.orders || []).length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-[#2D1A14]/40">Sin pedidos registrados.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Comparador lado a lado Cliché ↔ Bienestar. */
export function CompararTiendasSection() {
  const [period, setPeriod] = useState<Period>("1m")
  const local = useSummary("/api/admin/peer?self=1")
  const peer = useSummary("/api/admin/peer")
  const a = useMemo(() => (local.data ? metrics(local.data, period) : null), [local.data, period])
  const b = useMemo(() => (peer.data ? metrics(peer.data, period) : null), [peer.data, period])

  if ((local.loading && !local.data) || (peer.loading && !peer.data)) {
    return <div className="py-24 grid place-items-center"><RefreshCw className="w-6 h-6 animate-spin text-[#A67163]" /></div>
  }
  if (!local.data || !a) return <Retry error={local.error} onRetry={() => void local.load()} what="los datos de Cliché" />
  if (!peer.data || !b) return <Retry error={peer.error} onRetry={() => void peer.load(true)} what="la tienda Bienestar" />

  const stores = [
    { s: local.data, m: a, accent: CLICHE_ACCENT },
    { s: peer.data, m: b, accent: BIENESTAR_ACCENT },
  ]
  const rows: { label: string; vals: { f: string | number; v: number }[] }[] = [
    { label: "Ingresos del periodo", vals: stores.map(x => ({ f: fmt(x.m.revenue), v: x.m.revenue })) },
    { label: "Pedidos del periodo", vals: stores.map(x => ({ f: x.m.curr.length, v: x.m.curr.length })) },
    { label: "Ticket promedio", vals: stores.map(x => ({ f: fmt(x.m.aov), v: x.m.aov })) },
    { label: "Clientes únicos (histórico)", vals: stores.map(x => ({ f: x.m.clientes, v: x.m.clientes })) },
    { label: "Suscriptores newsletter", vals: stores.map(x => ({ f: x.s.subscribers_count, v: x.s.subscribers_count })) },
    { label: "Productos visibles", vals: stores.map(x => ({ f: x.m.activos, v: x.m.activos })) },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <p className="text-xs text-[#2D1A14]/50">Comparación en vivo de las dos tiendas del negocio.</p>
        <div className="ml-auto flex items-center gap-2">
          <PeriodTabs period={period} onChange={setPeriod} />
          <button onClick={() => { void local.load(); void peer.load(true) }} className="p-2 bg-white border border-[#2D1A14]/10 rounded-xl hover:bg-[#2D1A14]/5" aria-label="Actualizar">
            <RefreshCw className={`w-4 h-4 text-[#2D1A14] ${local.loading || peer.loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#2D1A14]/8 overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead><tr className="border-b border-[#2D1A14]/8">
            <th className="px-4 py-4 text-left text-[10px] uppercase tracking-wider text-[#2D1A14]/45">Métrica</th>
            {stores.map(x => (
              <th key={x.s.store} className="px-4 py-4">
                <div className="flex items-center gap-2 justify-center">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: x.accent }} />
                  <span className="font-bold text-[#2D1A14]">{x.s.name}</span>
                </div>
              </th>
            ))}
          </tr></thead>
          <tbody>
            {rows.map(r => {
              const total = r.vals.reduce((s, x) => s + x.v, 0)
              return (
                <tr key={r.label} className="border-b border-[#2D1A14]/5 last:border-0">
                  <td className="px-4 py-3 text-[#2D1A14]/60">{r.label}</td>
                  {r.vals.map((x, i) => (
                    <td key={i} className="px-4 py-3 text-center">
                      <p className={`font-bold text-[#2D1A14] ${total > 0 && x.v >= total - x.v ? "" : "opacity-60"}`}>{x.f}</p>
                      <div className="mt-1.5 h-1 max-w-32 mx-auto bg-[#2D1A14]/8 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${total > 0 ? (x.v / total) * 100 : 0}%`, background: stores[i].accent }} />
                      </div>
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {stores.map(x => (
          <div key={x.s.store} className="bg-white rounded-2xl border border-[#2D1A14]/8 p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: x.accent }} />
              <p className="text-xs font-semibold uppercase tracking-wider text-[#2D1A14]">Top productos · {x.s.name}</p>
            </div>
            {x.m.top.length === 0 ? <p className="text-sm text-[#2D1A14]/40">Sin ventas en el periodo.</p> : (
              <div className="space-y-3">
                {x.m.top.map(p => (
                  <div key={p.name}>
                    <div className="flex justify-between text-sm mb-1"><span className="text-[#2D1A14]">{p.name}</span><span className="text-[#2D1A14]/50">{p.qty} uds</span></div>
                    <div className="h-1.5 bg-[#2D1A14]/8 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(p.qty / x.m.top[0].qty) * 100}%`, background: x.accent }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
