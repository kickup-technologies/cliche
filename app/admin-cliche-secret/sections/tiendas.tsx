"use client"

/**
 * Multi-tienda: administración COMPLETA de Bienestar dentro del panel de
 * Cliché — con la temática de Bienestar (sage/crema) — y el comparador.
 *
 * La gestión escribe de verdad: /api/admin/peer/<ruta> → puente peer-admin de
 * Bienestar → sus APIs admin reales (pedidos, productos).
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  RefreshCw, AlertCircle, ExternalLink, Package, ShoppingBag, TrendingUp, Mail,
  Plus, Trash2, Save, ArrowUpRight,
} from "lucide-react"
import { adminFetch } from "@/lib/admin-client"
import type { PeerSummary, PeerOrder, PeerStats } from "@/lib/peer"

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
  // Números EXACTOS desde la BD (admin_store_stats) cuando llegan; la muestra
  // de 200 pedidos queda solo como respaldo y para top productos/tablas.
  const key = (period === "1m" ? "30d" : period === "3m" ? "90d" : period) as keyof PeerStats["windows"]
  const w = s.stats?.windows?.[key]
  const ordersCount = w ? w.orders : curr.length
  const prevOrders = w ? w.prev_orders : prev.length
  const revenue = w ? w.revenue : curr.reduce((a, o) => a + (o.total || 0), 0)
  const prevRevenue = w ? w.prev_revenue : prev.reduce((a, o) => a + (o.total || 0), 0)
  const aov = ordersCount ? revenue / ordersCount : 0
  const prevAov = prevOrders ? prevRevenue / prevOrders : 0
  const top = (() => {
    const map = new Map<string, { name: string; qty: number }>()
    for (const o of curr) for (const it of o.items || []) {
      const c = map.get(it.name) || { name: it.name, qty: 0 }
      c.qty += it.qty; map.set(it.name, c)
    }
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 6)
  })()
  const clientes = s.stats?.unique_customers ?? new Set(confirmed.map(o => (o.email || o.phone || o.customer_name || "").toLowerCase())).size
  const activos = (s.products || []).filter(p => p.active).length
  return { curr, prev, ordersCount, prevOrders, revenue, prevRevenue, aov, prevAov, top, clientes, activos }
}

function PeriodTabs({ period, onChange }: { period: Period; onChange: (p: Period) => void }) {
  const opts: { id: Period; label: string }[] = [
    { id: "7d", label: "7 días" }, { id: "1m", label: "30 días" }, { id: "3m", label: "90 días" }, { id: "all", label: "Todo" },
  ]
  return (
    <div className="flex gap-1 bg-white border border-[#2D1A14]/10 rounded-xl p-1 overflow-x-auto max-w-full">
      {opts.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)}
          className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg transition whitespace-nowrap ${period === o.id ? "bg-[#6E7A6D] text-white" : "text-[#2D1A14]/60 hover:bg-[#2D1A14]/5"}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Card({ label, value, sub, change }: { label: string; value: string | number; sub?: string; change?: number | null }) {
  return (
    <div className="pv-card p-5">
      <p className="pv-muted text-xs font-semibold uppercase tracking-wider mb-2">{label}</p>
      <p className="pv-ink text-2xl font-bold leading-none">{value}</p>
      {sub && <p className="pv-muted text-xs mt-1.5 opacity-70">{sub}</p>}
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

// Formas nativas del admin de Bienestar
type BOrder = {
  id: string; created_at: string; customer_name: string; phone?: string; email?: string;
  city?: string; items: { id?: string; name: string; qty: number; price?: number }[] | null;
  subtotal: number; status: string; payment_method?: string;
}
type BProduct = {
  id: string; name: string; kind: string | null; benefit: string | null; price: number;
  image: string | null; image2: string | null; badge: string | null; active: boolean; sort_order: number | null;
}
const B_STATUS: Record<string, string> = {
  nuevo: "Nuevo", pendiente_pago: "Pendiente de pago", pagado: "Pagado",
  enviado: "Enviado", entregado: "Entregado", cancelado: "Cancelado",
}

// Caché en memoria del navegador: al volver a entrar a una vista, los datos
// aparecen AL INSTANTE (y se refrescan en segundo plano). Sin esto, cada
// cambio de tienda montaba la sección vacía y mostraba un spinner.
const summaryCache: Record<string, PeerSummary> = {}
const manageCache: { orders?: BOrder[]; products?: BProduct[] } = {}

/** Precarga los resúmenes apenas se desbloquea el panel (fire-and-forget). */
export function prefetchTiendas() {
  for (const url of ["/api/admin/peer", "/api/admin/peer?self=1"]) {
    if (summaryCache[url]) continue
    adminFetch(url).then(async r => {
      const d = await r.json().catch(() => null)
      if (r.ok && d) summaryCache[url] = d
    }).catch(() => {})
  }
}

async function peerApi(path: string, init?: RequestInit) {
  const r = await adminFetch(`/api/admin/peer/${path}`, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.error || `Error ${r.status}`)
  return data
}

function useSummary(url: string) {
  // Arranca con la caché: la vista pinta al instante y se refresca detrás.
  const [data, setData] = useState<PeerSummary | null>(summaryCache[url] || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const load = useCallback(async (fresh = false) => {
    setLoading(true); setError("")
    try {
      const r = await adminFetch(`${url}${fresh && !url.includes("?") ? "?fresh=1" : ""}`)
      const d = await r.json().catch(() => null)
      if (!r.ok || !d) throw new Error(d?.error || `Error ${r.status}`)
      summaryCache[url] = d
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

const PRODUCT_VACIO: Partial<BProduct> = { name: "", kind: "", benefit: "", price: 0, image: "", image2: "", badge: "", active: true, sort_order: 0 }

/** Administración completa de Bienestar dentro del panel de Cliché. */
export function BienestarSection() {
  const [period, setPeriod] = useState<Period>("1m")
  const [tab, setTab] = useState<"resumen" | "pedidos" | "productos">("resumen")
  const { data, loading, error, load } = useSummary("/api/admin/peer")
  const m = useMemo(() => (data ? metrics(data, period) : null), [data, period])

  const [orders, setOrders] = useState<BOrder[]>(manageCache.orders || [])
  const [products, setProducts] = useState<BProduct[]>(manageCache.products || [])
  const [busy, setBusy] = useState("")
  const [manageError, setManageError] = useState("")
  const [draft, setDraft] = useState<Partial<BProduct> | null>(null)

  const loadManage = useCallback(async () => {
    setManageError("")
    try {
      const [o, p] = await Promise.all([peerApi("orders"), peerApi("products")])
      manageCache.orders = o.orders || []
      manageCache.products = p.products || []
      setOrders(o.orders || [])
      setProducts(p.products || [])
    } catch (e) { setManageError(e instanceof Error ? e.message : "Error cargando la gestión") }
  }, [])

  useEffect(() => { if (tab !== "resumen" && orders.length === 0 && products.length === 0) void loadManage() }, [tab, orders.length, products.length, loadManage])

  async function setOrderStatus(id: string, status: string) {
    setBusy(id)
    try {
      await peerApi("orders", { method: "PATCH", body: JSON.stringify({ id, status }) })
      setOrders(v => v.map(o => o.id === id ? { ...o, status } : o))
    } catch (e) { alert(e instanceof Error ? e.message : "No se pudo actualizar") }
    finally { setBusy("") }
  }

  async function saveProduct() {
    if (!draft) return
    setBusy(draft.id || "nuevo")
    try {
      if (draft.id && products.some(p => p.id === draft.id)) {
        const { product } = await peerApi("products", { method: "PATCH", body: JSON.stringify(draft) })
        setProducts(v => v.map(p => p.id === product.id ? product : p))
      } else {
        const { product } = await peerApi("products", { method: "POST", body: JSON.stringify(draft) })
        setProducts(v => [...v, product])
      }
      setDraft(null)
    } catch (e) { alert(e instanceof Error ? e.message : "No se pudo guardar") }
    finally { setBusy("") }
  }

  async function deleteProduct(p: BProduct) {
    if (!confirm(`¿Eliminar "${p.name}" de la tienda Bienestar? Esta acción no se puede deshacer.`)) return
    setBusy(p.id)
    try {
      await peerApi(`products?id=${encodeURIComponent(p.id)}`, { method: "DELETE" })
      setProducts(v => v.filter(x => x.id !== p.id))
    } catch (e) { alert(e instanceof Error ? e.message : "No se pudo eliminar") }
    finally { setBusy("") }
  }

  async function openFullPanel() {
    setBusy("full-panel")
    try {
      const r = await adminFetch("/api/admin/peer-login", { method: "POST" })
      const d = await r.json().catch(() => null)
      if (!r.ok || !d?.url) throw new Error(d?.error || `Error ${r.status}`)
      window.open(d.url, "_blank", "noopener")
    } catch (e) { alert(e instanceof Error ? e.message : "No se pudo abrir el panel de Bienestar") }
    finally { setBusy("") }
  }

  if (loading && !data) return <div className="py-24 grid place-items-center"><RefreshCw className="w-6 h-6 animate-spin text-[#A67163]" /></div>
  if (!data || !m) return <Retry error={error || "Sin conexión aún."} onRetry={() => void load(true)} what="la tienda Bienestar" />

  const TABS = [{ id: "resumen", label: "Resumen" }, { id: "pedidos", label: "Pedidos" }, { id: "productos", label: "Productos" }] as const

  return (
    <div className="peer-skin space-y-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs pv-muted">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: BIENESTAR_ACCENT }} />
        <span>Administrando <strong className="pv-ink">{data.name}</strong> — los cambios se aplican en la tienda real</span>
        <a href={data.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 pv-accent font-semibold hover:underline">
          ver tienda <ExternalLink className="w-3 h-3" />
        </a>
        <div className="ml-auto flex items-center gap-2">
          {tab === "resumen" && <PeriodTabs period={period} onChange={setPeriod} />}
          <button onClick={() => { void load(true); if (tab !== "resumen") void loadManage() }} className="p-2 bg-white rounded-xl border" style={{ borderColor: "var(--pv-soft)" }} aria-label="Actualizar">
            <RefreshCw className={`w-4 h-4 pv-ink ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => void openFullPanel()} disabled={busy === "full-panel"}
            className="inline-flex items-center gap-1.5 pv-btn text-xs font-semibold rounded-xl px-3 py-2 disabled:opacity-60">
            <ArrowUpRight className="w-3.5 h-3.5" />Abrir panel completo
          </button>
        </div>
      </div>

      <div className="pv-tabs" role="tablist">
        <span className="pv-tab-thumb" style={{ transform: `translateX(${TABS.findIndex(t => t.id === tab) * 100}%)` }} aria-hidden />
        {TABS.map(t => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "on" : ""}
            onClick={() => { setTab(t.id); if (t.id !== "resumen") void loadManage() }}>{t.label}</button>
        ))}
      </div>

      {manageError && tab !== "resumen" && <p className="flex items-center gap-2 text-xs bg-red-50 text-red-600 rounded-xl p-3"><AlertCircle className="w-4 h-4 shrink-0" />{manageError}</p>}

      {tab === "resumen" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card label="Ingresos" value={fmt(m.revenue)} change={pct(m.revenue, m.prevRevenue)} />
            <Card label="Pedidos" value={m.ordersCount} change={pct(m.ordersCount, m.prevOrders)} />
            <Card label="Ticket promedio" value={fmt(m.aov)} change={pct(m.aov, m.prevAov)} />
            <Card label="Suscriptores" value={data.subscribers_count} sub="newsletter (total)" />
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="pv-card p-5">
              <p className="pv-muted text-xs font-semibold uppercase tracking-wider mb-4">Top productos del periodo</p>
              {m.top.length === 0 ? <p className="pv-muted text-sm opacity-70">Sin ventas en el periodo.</p> : (
                <div className="space-y-3">
                  {m.top.map(p => (
                    <div key={p.name}>
                      <div className="flex justify-between text-sm mb-1"><span className="pv-ink">{p.name}</span><span className="pv-muted">{p.qty} uds</span></div>
                      <div className="pv-track"><i style={{ width: `${(p.qty / m.top[0].qty) * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="pv-card p-5">
              <p className="pv-muted text-xs font-semibold uppercase tracking-wider mb-4">La tienda de un vistazo</p>
              <ul className="pv-ink text-sm space-y-2 opacity-80">
                <li className="flex items-center gap-2"><Package className="w-4 h-4 pv-accent" /> {m.activos} productos visibles ({(data.products || []).length} en total)</li>
                <li className="flex items-center gap-2"><ShoppingBag className="w-4 h-4 pv-accent" /> {(data.orders || []).filter(o => o.confirmed).length} pedidos confirmados recientes</li>
                <li className="flex items-center gap-2"><TrendingUp className="w-4 h-4 pv-accent" /> {m.clientes} clientes únicos con compra</li>
                <li className="flex items-center gap-2"><Mail className="w-4 h-4 pv-accent" /> {data.subscribers_count} correos en el newsletter</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {tab === "pedidos" && (
        <div className="pv-card overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead><tr className="pv-thead">
              <th>Fecha</th><th>Cliente</th><th>Ciudad</th><th>Items</th><th>Total</th><th>Estado</th>
            </tr></thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="pv-row align-top">
                  <td className="whitespace-nowrap pv-muted">{new Date(o.created_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}</td>
                  <td className="pv-ink">{o.customer_name}<br /><small className="pv-muted">{o.phone || ""}{o.email ? ` · ${o.email}` : ""}</small></td>
                  <td>{o.city || "—"}</td>
                  <td className="max-w-56">{(o.items || []).map(i => `${i.qty}× ${i.name}`).join(", ")}</td>
                  <td className="font-semibold whitespace-nowrap">{fmt(o.subtotal)}</td>
                  <td>
                    <select value={o.status} disabled={busy === o.id} className="pv-input font-semibold"
                      onChange={e => void setOrderStatus(o.id, e.target.value)}>
                      {Object.entries(B_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center pv-muted">Sin pedidos (o aún cargando…).</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "productos" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="pv-muted text-xs">{products.length} productos · los cambios se reflejan al instante en la tienda Bienestar.</p>
            <button onClick={() => setDraft({ ...PRODUCT_VACIO, sort_order: products.length * 10 })}
              className="flex items-center gap-1.5 pv-btn text-xs font-semibold rounded-xl px-3 py-2"><Plus className="w-3.5 h-3.5" />Nuevo producto</button>
          </div>

          {draft && (
            <div className="pv-card p-5 space-y-3" style={{ borderColor: "rgba(110,122,109,.5)" }}>
              <p className="pv-ink text-sm font-bold">{draft.id && products.some(p => p.id === draft.id) ? `Editar: ${draft.name}` : "Nuevo producto en Bienestar"}</p>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                {([
                  ["name", "Nombre"], ["id", "ID único (tipo slug, solo al crear)"], ["kind", "Tipo (p. ej. Vela Aromática · 90 gr)"], ["benefit", "Beneficio (texto de la tarjeta)"],
                  ["image", "Imagen principal (/products/…)"], ["image2", "Imagen hover"], ["badge", "Badge (opcional)"],
                ] as const).map(([k, label]) => (
                  <label key={k} className="block">
                    <span className="pv-muted text-[10px] uppercase tracking-wider font-semibold">{label}</span>
                    <input value={String((draft as Record<string, unknown>)[k] ?? "")} onChange={e => setDraft(d => ({ ...d, [k]: e.target.value }))} className="pv-input mt-1 w-full" />
                  </label>
                ))}
                <label className="block">
                  <span className="pv-muted text-[10px] uppercase tracking-wider font-semibold">Precio (COP)</span>
                  <input type="number" value={draft.price ?? 0} onChange={e => setDraft(d => ({ ...d, price: Number(e.target.value) }))} className="pv-input mt-1 w-full" />
                </label>
                <label className="block">
                  <span className="pv-muted text-[10px] uppercase tracking-wider font-semibold">Orden</span>
                  <input type="number" value={draft.sort_order ?? 0} onChange={e => setDraft(d => ({ ...d, sort_order: Number(e.target.value) }))} className="pv-input mt-1 w-full" />
                </label>
                <label className="flex items-center gap-2 text-sm pv-ink">
                  <input type="checkbox" checked={draft.active !== false} onChange={e => setDraft(d => ({ ...d, active: e.target.checked }))} style={{ accentColor: "#6E7A6D" }} />
                  Visible en la tienda
                </label>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => void saveProduct()} disabled={Boolean(busy)} className="flex items-center gap-1.5 pv-btn text-xs font-semibold rounded-xl px-4 py-2 disabled:opacity-60"><Save className="w-3.5 h-3.5" />Guardar</button>
                <button onClick={() => setDraft(null)} className="pv-muted text-xs font-semibold px-3">Cancelar</button>
              </div>
            </div>
          )}

          <div className="pv-card overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead><tr className="pv-thead">
                <th>Producto</th><th>Tipo</th><th>Precio</th><th>Estado</th><th className="text-right">Acciones</th>
              </tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} className="pv-row">
                    <td>
                      <div className="flex items-center gap-3">
                        {p.image && <img src={`https://bienestar-by-cliche.vercel.app${p.image}`} alt="" className="w-9 h-9 rounded-lg object-cover" style={{ background: "rgba(35,41,32,.06)" }} />}
                        <div><p className="pv-ink font-medium">{p.name}</p><p className="pv-muted text-[11px]">{p.id}</p></div>
                      </div>
                    </td>
                    <td className="pv-muted">{p.kind}</td>
                    <td className="font-semibold whitespace-nowrap">{fmt(p.price)}</td>
                    <td>
                      <button onClick={() => void (async () => {
                        setBusy(p.id)
                        try {
                          const { product } = await peerApi("products", { method: "PATCH", body: JSON.stringify({ id: p.id, active: !p.active }) })
                          setProducts(v => v.map(x => x.id === p.id ? product : x))
                        } catch (e) { alert(e instanceof Error ? e.message : "Error") } finally { setBusy("") }
                      })()} disabled={busy === p.id}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {p.active ? "Visible" : "Oculto"}
                      </button>
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <button onClick={() => setDraft(p)} className="pv-accent text-xs font-semibold hover:underline mr-3">Editar</button>
                      <button onClick={() => void deleteProduct(p)} disabled={busy === p.id} className="text-red-500/70 hover:text-red-600" aria-label={`Eliminar ${p.name}`}><Trash2 className="w-4 h-4 inline" /></button>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center pv-muted">Cargando productos de Bienestar…</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
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
    { label: "Pedidos del periodo", vals: stores.map(x => ({ f: x.m.ordersCount, v: x.m.ordersCount })) },
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
