"use client"

import { useState, useEffect, useCallback } from "react"
import { createServerClientBrowser } from "@/lib/supabase"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import {
  Settings, Package, TrendingUp, ToggleLeft, ToggleRight,
  Save, Eye, RefreshCw, ShoppingBag, DollarSign, AlertCircle,
  X, Plus, Pencil, Lock, Users, BarChart3, MapPin, Tag,
  ArrowUpRight, ArrowDownRight, Minus, Truck, CheckCircle,
  Clock, LogOut, ChevronDown, Star,
} from "lucide-react"
import type { Product } from "@/lib/supabase"

// ── Types ──────────────────────────────────────────────────────────────────────
type Tab = "resumen" | "pedidos" | "productos" | "marketing" | "configuracion"
type Period = "1d" | "7d" | "1m" | "3m" | "6m" | "1y"

interface Setting { key: string; value: string }

interface Order {
  id: string
  stripe_session_id: string | null
  customer_email: string | null
  customer_name: string | null
  customer_phone: string | null
  total: number
  status: string
  created_at: string
  items: Array<{ name?: string; product_id: string; quantity: number; price?: number }>
  shipping_address: { address?: string; city?: string; department?: string; notes?: string } | null
  discount_code: string | null
  discount_amount: number
  tracking_number: string | null
}

interface PageView { path: string; created_at: string }

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n)

function cutoffDate(period: Period): Date {
  const now = new Date()
  const days: Record<Period, number> = { "1d": 1, "7d": 7, "1m": 30, "3m": 90, "6m": 180, "1y": 365 }
  return new Date(now.getTime() - days[period] * 24 * 60 * 60 * 1000)
}

function filterByPeriod<T extends { created_at: string }>(items: T[], period: Period): T[] {
  const cutoff = cutoffDate(period)
  return items.filter((i) => new Date(i.created_at) >= cutoff)
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}

function doublePeriodCutoff(period: Period): Date {
  const days: Record<Period, number> = { "1d": 1, "7d": 7, "1m": 30, "3m": 90, "6m": 180, "1y": 365 }
  const d = days[period]
  const now = new Date()
  return new Date(now.getTime() - d * 2 * 24 * 60 * 60 * 1000)
}

const ORDER_STATUSES: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: "Pendiente",     color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  confirmed: { label: "Confirmado",    color: "text-blue-700",   bg: "bg-blue-50 border-blue-200" },
  preparing: { label: "En preparación",color: "text-[#A67163]",  bg: "bg-[#A67163]/10 border-[#A67163]/20" },
  shipped:   { label: "Despachado",    color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  delivered: { label: "Entregado",     color: "text-green-700",  bg: "bg-green-50 border-green-200" },
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, iconColor, change,
}: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; iconColor: string; change?: number | null
}) {
  const isPos = (change ?? 0) >= 0
  return (
    <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-[#2D1A14]/50 font-medium uppercase tracking-wider">{label}</p>
        <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
      </div>
      <p className="text-2xl font-bold text-[#2D1A14] leading-none mb-1">{value}</p>
      {sub && <p className="text-xs text-[#2D1A14]/40">{sub}</p>}
      {change !== undefined && change !== null && (
        <div className={`mt-2 flex items-center gap-1 text-xs font-semibold ${isPos ? "text-green-600" : "text-red-500"}`}>
          {isPos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(change).toFixed(1)}% vs periodo anterior
        </div>
      )}
      {change === null && <p className="mt-2 text-xs text-[#2D1A14]/30">— sin datos anteriores</p>}
    </div>
  )
}

// ── Period selector ────────────────────────────────────────────────────────────
const PERIODS: { value: Period; label: string }[] = [
  { value: "1d", label: "Hoy" },
  { value: "7d", label: "7 días" },
  { value: "1m", label: "1 mes" },
  { value: "3m", label: "3 meses" },
  { value: "6m", label: "6 meses" },
  { value: "1y", label: "1 año" },
]

function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex items-center gap-1 bg-[#2D1A14]/5 rounded-xl p-1">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            value === p.value
              ? "bg-white text-[#2D1A14] shadow-sm"
              : "text-[#2D1A14]/50 hover:text-[#2D1A14]"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

// ── Mini bar chart (CSS only) ──────────────────────────────────────────────────
function MiniBar({ value, max, color = "bg-[#A67163]" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="h-1.5 bg-[#2D1A14]/8 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Main component
// ══════════════════════════════════════════════════════════════════════════════
export default function AdminPage() {
  // ── Auth ──
  const [authed, setAuthed] = useState(false)
  const [pwInput, setPwInput] = useState("")
  const [authError, setAuthError] = useState("")
  const [authLoading, setAuthLoading] = useState(false)

  // ── Data ──
  const [tab, setTab] = useState<Tab>("resumen")
  const [period, setPeriod] = useState<Period>("1m")
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [pageViews, setPageViews] = useState<PageView[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // ── Order detail / status ──
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [trackingInput, setTrackingInput] = useState("")
  const [statusInput, setStatusInput] = useState("")
  const [orderSaving, setOrderSaving] = useState(false)

  // ── Product modal ──
  const [modal, setModal] = useState<{ open: boolean; product: Partial<Product> | null }>({ open: false, product: null })
  const [modalSaving, setModalSaving] = useState(false)
  const [modalError, setModalError] = useState("")

  // ── Check session on mount ──
  useEffect(() => {
    const token = sessionStorage.getItem("cliche_admin_auth")
    if (token === "ok") setAuthed(true)
  }, [])

  // ── Login ──
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError("")
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwInput }),
      })
      if (!res.ok) { setAuthError("Contraseña incorrecta"); return }
      sessionStorage.setItem("cliche_admin_auth", "ok")
      setAuthed(true)
    } catch {
      setAuthError("Error de conexión")
    } finally {
      setAuthLoading(false)
    }
  }

  function handleLogout() {
    sessionStorage.removeItem("cliche_admin_auth")
    setAuthed(false)
    setPwInput("")
  }

  // ── Load data ──
  const loadAll = useCallback(async () => {
    setLoading(true)
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
    const [{ data: prods }, { data: ords }, { data: setts }, { data: views }] = await Promise.all([
      supabase.from("products").select("*").order("created_at"),
      supabase.from("orders").select("*").gte("created_at", oneYearAgo).order("created_at", { ascending: false }),
      supabase.from("site_settings").select("*"),
      supabase.from("page_views").select("path, created_at").gte("created_at", oneYearAgo),
    ])
    setProducts(prods || [])
    setOrders(ords || [])
    setPageViews(views || [])
    const map: Record<string, string> = {}
    ;(setts || []).forEach((s: Setting) => { map[s.key] = s.value })
    setSettings(map)
    setLoading(false)
  }, [])

  useEffect(() => { if (authed) loadAll() }, [authed, loadAll])

  // ── Derived metrics ──
  const confirmedStatuses = ["confirmed", "preparing", "shipped", "delivered", "paid"]

  const periodOrders = filterByPeriod(orders, period).filter((o) => confirmedStatuses.includes(o.status))
  const prevOrders   = orders
    .filter((o) => confirmedStatuses.includes(o.status))
    .filter((o) => {
      const d = new Date(o.created_at)
      const cutoff = cutoffDate(period)
      const prev = doublePeriodCutoff(period)
      return d >= prev && d < cutoff
    })

  const periodRevenue = periodOrders.reduce((s, o) => s + (o.total || 0), 0)
  const prevRevenue   = prevOrders.reduce((s, o) => s + (o.total || 0), 0)
  const aov           = periodOrders.length > 0 ? periodRevenue / periodOrders.length : 0
  const prevAov       = prevOrders.length > 0 ? prevRevenue / prevOrders.length : 0

  const periodViews   = filterByPeriod(pageViews, period)
  const prevViews     = pageViews.filter((v) => {
    const d = new Date(v.created_at)
    return d >= doublePeriodCutoff(period) && d < cutoffDate(period)
  })

  const convRate = periodViews.length > 0 ? (periodOrders.length / periodViews.length) * 100 : 0

  // Top products
  const productSales: Record<string, { name: string; units: number; revenue: number }> = {}
  for (const o of periodOrders) {
    for (const item of o.items || []) {
      const key = item.product_id
      if (!productSales[key]) productSales[key] = { name: item.name || key, units: 0, revenue: 0 }
      productSales[key].units   += item.quantity
      productSales[key].revenue += (item.price || 0) * item.quantity
    }
  }
  const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  const maxRevenue  = topProducts[0]?.revenue || 1

  // Status breakdown
  const statusCounts: Record<string, number> = {}
  for (const o of filterByPeriod(orders, period)) {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1
  }

  // Top cities
  const cities: Record<string, number> = {}
  for (const o of periodOrders) {
    const city = o.shipping_address?.city
    if (city) cities[city] = (cities[city] || 0) + 1
  }
  const topCities = Object.entries(cities).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const maxCity = topCities[0]?.[1] || 1

  // Discount code usage
  const codeCounts: Record<string, { uses: number; savings: number }> = {}
  for (const o of periodOrders) {
    if (o.discount_code) {
      const c = o.discount_code
      if (!codeCounts[c]) codeCounts[c] = { uses: 0, savings: 0 }
      codeCounts[c].uses++
      codeCounts[c].savings += o.discount_amount || 0
    }
  }
  const topCodes = Object.entries(codeCounts).sort((a, b) => b[1].uses - a[1].uses).slice(0, 5)

  // ── Settings helpers ──
  function setSetting(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  async function saveSettings() {
    setSaving(true)
    for (const [key, value] of Object.entries(settings)) {
      await supabase.from("site_settings").upsert({ key, value, updated_at: new Date().toISOString() })
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // ── Product modal ──
  function openEdit(product: Product) { setModalError(""); setModal({ open: true, product: { ...product } }) }
  function openNew() { setModalError(""); setModal({ open: true, product: { name: "", slug: "", price: 78000, stock: 50, rating: 4.8, reviews: 0, is_active: true } }) }
  function closeModal() { setModal({ open: false, product: null }); setModalError("") }
  function setField(key: string, value: string | number | boolean | null) {
    setModal((prev) => ({ ...prev, product: { ...prev.product, [key]: value } }))
  }
  function autoSlug(name: string) {
    return "aroma-" + name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  }

  async function saveProduct() {
    if (!modal.product) return
    const p = modal.product
    if (!p.name || !p.slug || !p.price) { setModalError("Nombre, slug y precio son requeridos"); return }
    setModalSaving(true); setModalError("")
    try {
      if (p.id) {
        const { error } = await supabase.from("products").update({ ...p, updated_at: new Date().toISOString() }).eq("id", p.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("products").insert({ ...p })
        if (error) throw error
      }
      await loadAll(); closeModal()
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Error al guardar")
    } finally { setModalSaving(false) }
  }

  async function updateStock(id: string, stock: number) {
    await supabase.from("products").update({ stock }).eq("id", id)
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, stock } : p)))
  }

  async function toggleProduct(id: string, is_active: boolean) {
    await supabase.from("products").update({ is_active }).eq("id", id)
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, is_active } : p)))
  }

  // ── Order status update ──
  function openOrder(o: Order) {
    setSelectedOrder(o)
    setStatusInput(o.status)
    setTrackingInput(o.tracking_number || "")
  }

  async function saveOrderStatus() {
    if (!selectedOrder) return
    setOrderSaving(true)
    const update: Record<string, string> = { status: statusInput }
    if (trackingInput.trim()) update.tracking_number = trackingInput.trim()
    await supabase.from("orders").update(update).eq("id", selectedOrder.id)
    setOrders((prev) => prev.map((o) => o.id === selectedOrder.id ? { ...o, ...update } : o))
    setSelectedOrder(null)
    setOrderSaving(false)
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LOGIN SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-[#2D1A14] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-[#2D1A14]">Panel Admin</h1>
            <p className="text-sm text-[#2D1A14]/50 mt-1">Bienestar by Cliché</p>
          </div>

          <form onSubmit={handleLogin} className="bg-white rounded-2xl border border-[#2D1A14]/10 p-6 shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-[#2D1A14]/50 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={pwInput}
                onChange={(e) => setPwInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#2D1A14]/15 bg-[#FAF8F5] text-[#2D1A14] text-sm focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
                placeholder="••••••••"
                autoFocus
              />
              {authError && (
                <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {authError}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full h-12 rounded-xl" disabled={authLoading}>
              {authLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
              Ingresar
            </Button>
          </form>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LOADING
  // ══════════════════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-7 h-7 animate-spin text-[#A67163] mx-auto mb-3" />
          <p className="text-sm text-[#2D1A14]/50">Cargando datos...</p>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN PANEL
  // ══════════════════════════════════════════════════════════════════════════
  const tabs = [
    { id: "resumen",       label: "Resumen",   icon: TrendingUp },
    { id: "pedidos",       label: "Pedidos",   icon: ShoppingBag },
    { id: "productos",     label: "Productos", icon: Package },
    { id: "marketing",     label: "Marketing", icon: Tag },
    { id: "configuracion", label: "Config",    icon: Settings },
  ] as const

  return (
    <div className="min-h-screen bg-[#FAF8F5]">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-[#2D1A14]/8 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#2D1A14] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm font-serif">C</span>
            </div>
            <div>
              <p className="font-semibold text-[#2D1A14] text-sm leading-none">Panel Admin</p>
              <p className="text-[10px] text-[#2D1A14]/40 mt-0.5">Bienestar by Cliché</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadAll} className="rounded-lg h-8 border-[#2D1A14]/15">
              <RefreshCw className="w-3 h-3 mr-1.5" /> Actualizar
            </Button>
            <Button size="sm" asChild className="rounded-lg h-8 bg-[#2D1A14] hover:bg-[#3D2A24]">
              <a href="/" target="_blank"><Eye className="w-3 h-3 mr-1.5" /> Ver tienda</a>
            </Button>
            <button
              onClick={handleLogout}
              className="w-8 h-8 rounded-lg border border-[#2D1A14]/15 flex items-center justify-center hover:bg-[#2D1A14]/5 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5 text-[#2D1A14]/50" />
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 flex gap-0 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id as Tab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === id ? "border-[#A67163] text-[#A67163]" : "border-transparent text-[#2D1A14]/50 hover:text-[#2D1A14]"
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* ════════════════════════════════════════════════════════════════
            TAB: RESUMEN
        ════════════════════════════════════════════════════════════════ */}
        {tab === "resumen" && (
          <div className="space-y-8">

            {/* Period selector */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl font-bold text-[#2D1A14]">Resumen</h2>
                <p className="text-sm text-[#2D1A14]/50 mt-0.5">Analíticas y rendimiento del negocio</p>
              </div>
              <PeriodSelector value={period} onChange={setPeriod} />
            </div>

            {/* KPI grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Ingresos"
                value={fmt(periodRevenue)}
                icon={DollarSign}
                iconColor="text-green-600"
                change={pctChange(periodRevenue, prevRevenue)}
              />
              <StatCard
                label="Pedidos"
                value={periodOrders.length}
                icon={ShoppingBag}
                iconColor="text-blue-600"
                change={pctChange(periodOrders.length, prevOrders.length)}
              />
              <StatCard
                label="Ticket promedio"
                value={aov > 0 ? fmt(aov) : "—"}
                sub="por pedido confirmado"
                icon={BarChart3}
                iconColor="text-[#A67163]"
                change={pctChange(aov, prevAov)}
              />
              <StatCard
                label="Visitas"
                value={periodViews.length.toLocaleString("es-CO")}
                sub={`${convRate.toFixed(1)}% conversión`}
                icon={Users}
                iconColor="text-purple-600"
                change={pctChange(periodViews.length, prevViews.length)}
              />
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-5">
                <p className="text-xs text-[#2D1A14]/50 font-medium uppercase tracking-wider mb-3">Productos activos</p>
                <p className="text-2xl font-bold text-[#2D1A14]">{products.filter((p) => p.is_active).length}</p>
                <p className="text-xs text-[#2D1A14]/40 mt-1">de {products.length} totales</p>
              </div>
              <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-5">
                <p className="text-xs text-[#2D1A14]/50 font-medium uppercase tracking-wider mb-3">Stock bajo</p>
                <p className={`text-2xl font-bold ${products.filter((p) => p.stock <= 5).length > 0 ? "text-red-500" : "text-[#2D1A14]"}`}>
                  {products.filter((p) => p.stock <= 5).length}
                </p>
                <p className="text-xs text-[#2D1A14]/40 mt-1">productos con 5 o menos unidades</p>
              </div>
              <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-5">
                <p className="text-xs text-[#2D1A14]/50 font-medium uppercase tracking-wider mb-3">Descuentos otorgados</p>
                <p className="text-2xl font-bold text-[#2D1A14]">
                  {fmt(periodOrders.reduce((s, o) => s + (o.discount_amount || 0), 0))}
                </p>
                <p className="text-xs text-[#2D1A14]/40 mt-1">en el periodo</p>
              </div>
              <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-5">
                <p className="text-xs text-[#2D1A14]/50 font-medium uppercase tracking-wider mb-3">Pedidos pendientes</p>
                <p className={`text-2xl font-bold ${statusCounts["pending"] > 0 ? "text-yellow-600" : "text-[#2D1A14]"}`}>
                  {statusCounts["pending"] || 0}
                </p>
                <p className="text-xs text-[#2D1A14]/40 mt-1">sin confirmar pago</p>
              </div>
            </div>

            {/* Bottom row: top products + cities + codes */}
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

            {/* Order status breakdown */}
            <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-5">
              <h3 className="text-sm font-semibold text-[#2D1A14] mb-4">Estado de pedidos en el periodo</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {Object.entries(ORDER_STATUSES).map(([key, st]) => (
                  <div key={key} className={`rounded-xl border px-4 py-3 ${st.bg}`}>
                    <p className={`text-xl font-bold ${st.color}`}>{statusCounts[key] || 0}</p>
                    <p className={`text-xs font-medium mt-0.5 ${st.color}`}>{st.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Top pages */}
            <div className="bg-white rounded-2xl border border-[#2D1A14]/8 overflow-hidden">
              <div className="px-5 py-4 border-b border-[#2D1A14]/8">
                <h3 className="text-sm font-semibold text-[#2D1A14]">Páginas más visitadas</h3>
              </div>
              <div className="divide-y divide-[#2D1A14]/5">
                {(() => {
                  const counts: Record<string, number> = {}
                  for (const v of periodViews) counts[v.path] = (counts[v.path] || 0) + 1
                  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6)
                  const maxV = top[0]?.[1] || 1
                  return top.length === 0 ? (
                    <p className="p-5 text-sm text-[#2D1A14]/40 text-center">Sin datos de tráfico aún (el tracker se activa con el próximo deploy)</p>
                  ) : top.map(([path, count]) => (
                    <div key={path} className="px-5 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm text-[#2D1A14] font-mono">{path}</p>
                        <p className="text-xs font-semibold text-[#2D1A14]">{count.toLocaleString("es-CO")} visitas</p>
                      </div>
                      <MiniBar value={count} max={maxV} color="bg-blue-400" />
                    </div>
                  ))
                })()}
              </div>
            </div>

          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB: PEDIDOS
        ════════════════════════════════════════════════════════════════ */}
        {tab === "pedidos" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
              <div>
                <h2 className="font-serif text-2xl font-bold text-[#2D1A14]">Pedidos</h2>
                <p className="text-sm text-[#2D1A14]/50 mt-0.5">{orders.length} pedidos en el último año</p>
              </div>
              <PeriodSelector value={period} onChange={setPeriod} />
            </div>

            {filterByPeriod(orders, period).length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-12 text-center">
                <ShoppingBag className="w-10 h-10 text-[#2D1A14]/20 mx-auto mb-3" />
                <p className="text-sm text-[#2D1A14]/40">Sin pedidos en este periodo</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#2D1A14]/8 overflow-hidden">
                <div className="divide-y divide-[#2D1A14]/6">
                  {filterByPeriod(orders, period).map((order) => {
                    const st = ORDER_STATUSES[order.status] || { label: order.status, color: "text-[#2D1A14]/50", bg: "bg-muted" }
                    return (
                      <div
                        key={order.id}
                        className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                        onClick={() => openOrder(order)}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-mono text-xs text-[#2D1A14]/40">
                              #{(order.stripe_session_id || order.id).slice(-8).toUpperCase()}
                            </p>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${st.bg} ${st.color}`}>
                              {st.label}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-[#2D1A14]">
                            {order.customer_name || order.customer_email || "—"}
                          </p>
                          <p className="text-xs text-[#2D1A14]/40 mt-0.5">
                            {order.shipping_address?.city && `${order.shipping_address.city} · `}
                            {new Date(order.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-[#2D1A14]">{fmt(order.total)}</p>
                          <p className="text-xs text-[#2D1A14]/40">{order.items?.length || 0} producto(s)</p>
                        </div>
                        <ChevronDown className="w-4 h-4 text-[#2D1A14]/30 -rotate-90 flex-shrink-0" />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB: PRODUCTOS
        ════════════════════════════════════════════════════════════════ */}
        {tab === "productos" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="font-serif text-2xl font-bold text-[#2D1A14]">Inventario</h2>
                <p className="text-sm text-[#2D1A14]/50 mt-0.5">{products.length} productos · {products.filter(p => p.stock <= 5).length} con stock bajo</p>
              </div>
              <Button size="sm" onClick={openNew} className="rounded-xl h-9 gap-1.5 bg-[#2D1A14] hover:bg-[#3D2A24]">
                <Plus className="w-3.5 h-3.5" /> Nuevo producto
              </Button>
            </div>

            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-2xl border border-[#2D1A14]/8 p-4">
                <div className="flex items-center gap-4">
                  <img
                    src={product.image_url || "/placeholder-product.jpg"}
                    alt={product.name}
                    className="w-14 h-14 object-contain rounded-xl bg-[#FAF8F5] p-1 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[#2D1A14] truncate">{product.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-sm text-[#2D1A14]/60">{fmt(product.price)}</p>
                      <span className="flex items-center gap-0.5 text-xs text-[#2D1A14]/40">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {product.rating} ({product.reviews})
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => updateStock(product.id, Math.max(0, product.stock - 1))}
                      className="w-7 h-7 rounded-lg border border-[#2D1A14]/15 hover:bg-[#FAF8F5] flex items-center justify-center text-sm font-bold text-[#2D1A14]">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className={`w-8 text-center font-bold text-sm ${product.stock <= 5 ? "text-red-500" : "text-[#2D1A14]"}`}>
                      {product.stock}
                    </span>
                    <button onClick={() => updateStock(product.id, product.stock + 1)}
                      className="w-7 h-7 rounded-lg border border-[#2D1A14]/15 hover:bg-[#FAF8F5] flex items-center justify-center text-sm font-bold text-[#2D1A14]">
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => toggleProduct(product.id, !product.is_active)}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                        product.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-[#2D1A14]/5 text-[#2D1A14]/40 border-[#2D1A14]/10"
                      }`}
                    >
                      {product.is_active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                      {product.is_active ? "Activo" : "Oculto"}
                    </button>
                    <button onClick={() => openEdit(product)}
                      className="w-8 h-8 rounded-lg border border-[#2D1A14]/15 hover:bg-[#FAF8F5] flex items-center justify-center transition-colors">
                      <Pencil className="w-3.5 h-3.5 text-[#2D1A14]/50" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB: MARKETING
        ════════════════════════════════════════════════════════════════ */}
        {tab === "marketing" && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#2D1A14]">Marketing</h2>
              <p className="text-sm text-[#2D1A14]/50 mt-0.5">Efectos de conversión y descuentos</p>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#2D1A14]/40">Efectos de urgencia</h3>
              {[
                { key: "urgency_bar_enabled",     label: "Barra de urgencia",        desc: "Barra superior con cuenta regresiva" },
                { key: "countdown_enabled",        label: "Contador de tiempo",        desc: "Timer en productos con oferta limitada" },
                { key: "stock_badge_enabled",      label: "Badges de stock bajo",      desc: "Muestra cantidad disponible cuando hay 5 o menos" },
                { key: "social_proof_enabled",     label: "Notificaciones sociales",   desc: "Toast tipo compra reciente de otro cliente" },
              ].map(({ key, label, desc }) => (
                <div key={key} className="bg-white rounded-xl border border-[#2D1A14]/8 p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-sm text-[#2D1A14]">{label}</p>
                    <p className="text-xs text-[#2D1A14]/40 mt-0.5">{desc}</p>
                  </div>
                  <button
                    onClick={() => setSetting(key, settings[key] === "true" ? "false" : "true")}
                    className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${settings[key] === "true" ? "bg-[#A67163]" : "bg-[#2D1A14]/15"}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings[key] === "true" ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>
              ))}
            </div>

            <Button onClick={saveSettings} disabled={saving} className="w-full h-11 rounded-xl bg-[#2D1A14] hover:bg-[#3D2A24]">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              {saved ? "Cambios guardados" : "Guardar cambios"}
            </Button>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB: CONFIGURACION
        ════════════════════════════════════════════════════════════════ */}
        {tab === "configuracion" && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#2D1A14]">Configuración</h2>
              <p className="text-sm text-[#2D1A14]/50 mt-0.5">Ajustes generales de la tienda</p>
            </div>

            {[
              { key: "announcement_text",      label: "Texto de la barra de anuncio",       type: "text" },
              { key: "free_shipping_threshold", label: "Mínimo para envío gratis (COP)",     type: "number" },
              { key: "whatsapp_number",         label: "Número WhatsApp (ej: 573194565463)", type: "text" },
              { key: "whatsapp_message",        label: "Mensaje predeterminado WhatsApp",    type: "text" },
            ].map(({ key, label, type }) => (
              <div key={key} className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-[#2D1A14]/50">{label}</label>
                <input
                  type={type}
                  value={settings[key] || ""}
                  onChange={(e) => setSetting(key, e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#2D1A14]/15 bg-white text-[#2D1A14] text-sm focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
                />
              </div>
            ))}

            <Button onClick={saveSettings} disabled={saving} className="w-full h-11 rounded-xl bg-[#2D1A14] hover:bg-[#3D2A24]">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              {saved ? "Guardado" : "Guardar configuración"}
            </Button>

            <div className="bg-[#2D1A14]/5 border border-[#2D1A14]/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Lock className="w-3.5 h-3.5 text-[#2D1A14]/50" />
                <p className="text-sm font-semibold text-[#2D1A14]">Acceso protegido</p>
              </div>
              <p className="text-xs text-[#2D1A14]/50">
                Esta URL es privada. La contraseña se configura con la variable de entorno <code className="font-mono">ADMIN_PASSWORD</code> en Vercel.
              </p>
            </div>
          </div>
        )}

      </div>

      {/* ════════════════════════════════════════════════════════════════
          ORDER DETAIL DRAWER
      ════════════════════════════════════════════════════════════════ */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setSelectedOrder(null)}>
          <div className="flex-1 bg-black/40" />
          <div
            className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-[#2D1A14]/8 px-6 py-4 flex items-center justify-between">
              <div>
                <p className="font-mono text-xs text-[#2D1A14]/40">
                  #{(selectedOrder.stripe_session_id || selectedOrder.id).slice(-8).toUpperCase()}
                </p>
                <p className="font-semibold text-[#2D1A14]">Detalle del pedido</p>
              </div>
              <button onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-lg hover:bg-[#FAF8F5] flex items-center justify-center">
                <X className="w-4 h-4 text-[#2D1A14]/50" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Customer */}
              <div className="bg-[#FAF8F5] rounded-xl p-4 space-y-1.5">
                <p className="text-xs font-bold uppercase tracking-widest text-[#2D1A14]/40 mb-2">Cliente</p>
                <p className="text-sm text-[#2D1A14]"><span className="text-[#2D1A14]/50">Nombre:</span> {selectedOrder.customer_name || "—"}</p>
                <p className="text-sm text-[#2D1A14]"><span className="text-[#2D1A14]/50">Email:</span> {selectedOrder.customer_email || "—"}</p>
                <p className="text-sm text-[#2D1A14]"><span className="text-[#2D1A14]/50">Tel:</span> {selectedOrder.customer_phone || "—"}</p>
              </div>

              {/* Shipping */}
              {selectedOrder.shipping_address && (
                <div className="bg-[#FAF8F5] rounded-xl p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#2D1A14]/40 mb-2">Dirección de envío</p>
                  <p className="text-sm text-[#2D1A14]">{selectedOrder.shipping_address.address}</p>
                  <p className="text-sm text-[#2D1A14]">{selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.department}</p>
                  {selectedOrder.shipping_address.notes && (
                    <p className="text-xs text-[#2D1A14]/50 mt-1 italic">{selectedOrder.shipping_address.notes}</p>
                  )}
                </div>
              )}

              {/* Items */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#2D1A14]/40 mb-3">Productos</p>
                <div className="space-y-2">
                  {(selectedOrder.items || []).map((item, i) => (
                    <div key={i} className="flex items-center justify-between bg-[#FAF8F5] rounded-xl px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-[#2D1A14]">{item.name || item.product_id}</p>
                        <p className="text-xs text-[#2D1A14]/40">x {item.quantity}</p>
                      </div>
                      {item.price && <p className="text-sm font-semibold text-[#2D1A14]">{fmt(item.price * item.quantity)}</p>}
                    </div>
                  ))}
                  <div className="flex justify-between px-4 py-2">
                    <span className="text-sm font-bold text-[#2D1A14]">Total</span>
                    <span className="text-sm font-bold text-[#A67163]">{fmt(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>

              {/* Update status */}
              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold uppercase tracking-widest text-[#2D1A14]/40">Actualizar estado</p>
                <select
                  value={statusInput}
                  onChange={(e) => setStatusInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#2D1A14]/15 bg-white text-[#2D1A14] text-sm focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
                >
                  {Object.entries(ORDER_STATUSES).map(([key, st]) => (
                    <option key={key} value={key}>{st.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value)}
                  placeholder="Número de guía (opcional)"
                  className="w-full px-4 py-3 rounded-xl border border-[#2D1A14]/15 bg-white text-[#2D1A14] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
                />
                <Button
                  className="w-full h-11 rounded-xl bg-[#2D1A14] hover:bg-[#3D2A24]"
                  onClick={saveOrderStatus}
                  disabled={orderSaving}
                >
                  {orderSaving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Guardar cambios
                </Button>
              </div>

              {/* Tracking link */}
              <a
                href={`/pedido/${selectedOrder.stripe_session_id || selectedOrder.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-[#A67163] hover:underline"
              >
                <Truck className="w-4 h-4" />
                Ver página de seguimiento del cliente
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          PRODUCT MODAL
      ════════════════════════════════════════════════════════════════ */}
      {modal.open && modal.product && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl border border-[#2D1A14]/10 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-[#2D1A14]/8 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="font-serif font-bold text-[#2D1A14]">
                {modal.product.id ? "Editar producto" : "Nuevo producto"}
              </h3>
              <button onClick={closeModal} className="w-8 h-8 rounded-lg hover:bg-[#FAF8F5] flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {[
                { key: "name", label: "Nombre *", type: "text", placeholder: "Aroma Tao" },
                { key: "slug", label: "Slug * (URL)", type: "text", placeholder: "aroma-tao", mono: true },
              ].map(({ key, label, type, placeholder, mono }) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-[#2D1A14]/50 uppercase tracking-wide mb-1.5 block">{label}</label>
                  <input
                    type={type}
                    value={(modal.product as Record<string, unknown>)[key] as string || ""}
                    onChange={(e) => {
                      setField(key, e.target.value)
                      if (key === "name" && !modal.product?.id) setField("slug", autoSlug(e.target.value))
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl border border-[#2D1A14]/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A67163]/40 ${mono ? "font-mono" : ""}`}
                    placeholder={placeholder}
                  />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "price", label: "Precio COP *", placeholder: "78000" },
                  { key: "original_price", label: "Precio original", placeholder: "90000" },
                  { key: "stock", label: "Stock", placeholder: "50" },
                  { key: "rating", label: "Rating (0-5)", placeholder: "4.8", step: "0.1" },
                ].map(({ key, label, placeholder, step }) => (
                  <div key={key}>
                    <label className="text-xs font-semibold text-[#2D1A14]/50 uppercase tracking-wide mb-1.5 block">{label}</label>
                    <input
                      type="number"
                      step={step}
                      value={(modal.product as Record<string, unknown>)[key] as number ?? ""}
                      onChange={(e) => setField(key, e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#2D1A14]/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
                      placeholder={placeholder}
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-xs font-semibold text-[#2D1A14]/50 uppercase tracking-wide mb-1.5 block">Descripción</label>
                <textarea rows={3} value={modal.product.description || ""}
                  onChange={(e) => setField("description", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#2D1A14]/15 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
                  placeholder="Describe el producto..."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#2D1A14]/50 uppercase tracking-wide mb-1.5 block">URL de imagen</label>
                <input type="text" value={modal.product.image_url || ""}
                  onChange={(e) => setField("image_url", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#2D1A14]/15 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
                  placeholder="https://..."
                />
                {modal.product.image_url?.startsWith("http") && (
                  <img src={modal.product.image_url} alt="preview" className="mt-2 w-14 h-14 object-cover rounded-lg border border-[#2D1A14]/10" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#2D1A14]/50 uppercase tracking-wide mb-1.5 block">Badge</label>
                  <input type="text" value={modal.product.badge || ""}
                    onChange={(e) => setField("badge", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#2D1A14]/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
                    placeholder="Nuevo"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#2D1A14]/50 uppercase tracking-wide mb-1.5 block">Color badge</label>
                  <select value={modal.product.badge_color || ""}
                    onChange={(e) => setField("badge_color", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#2D1A14]/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A67163]/40">
                    <option value="">Sin badge</option>
                    <option value="bg-primary">Terracota</option>
                    <option value="bg-amber-500">Ambar</option>
                    <option value="bg-green-600">Verde</option>
                    <option value="bg-red-500">Rojo</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input type="checkbox" id="is_active" checked={modal.product.is_active ?? true}
                  onChange={(e) => setField("is_active", e.target.checked)}
                  className="w-4 h-4 accent-[#A67163]"
                />
                <label htmlFor="is_active" className="text-sm text-[#2D1A14] font-medium">Producto activo (visible en tienda)</label>
              </div>

              {modalError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {modalError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 rounded-xl border-[#2D1A14]/15" onClick={closeModal} disabled={modalSaving}>
                  Cancelar
                </Button>
                <Button className="flex-1 rounded-xl bg-[#2D1A14] hover:bg-[#3D2A24]" onClick={saveProduct} disabled={modalSaving}>
                  {modalSaving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  {modal.product.id ? "Guardar" : "Crear"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
