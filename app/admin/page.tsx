"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Percent, Tag, Save, CheckCircle, AlertCircle, RefreshCw,
  ShoppingBag, Clock, Truck, Package, MapPin, ChevronDown, Search,
  Settings
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────
interface Order {
  id: string
  status: string
  total: number
  tracking_number: string | null
  customer_name: string | null
  created_at: string
  email?: string
}

const ORDER_STATUSES = ["pending", "confirmed", "preparing", "shipped", "delivered"] as const
const STATUS_LABELS: Record<string, string> = {
  pending:   "Recibido",
  confirmed: "Confirmado",
  preparing: "Preparando",
  shipped:   "Despachado",
  delivered: "Entregado",
}
const STATUS_COLOR: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  preparing: "bg-orange-100 text-orange-700",
  shipped:   "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────
function SettingsTab() {
  const [discount, setDiscount] = useState(10)
  const [code, setCode] = useState("BIENVENIDA10")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle")

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setDiscount(data.discount_percentage)
        setCode(data.discount_code)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    setStatus("idle")
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discount_percentage: discount, discount_code: code }),
      })
      const data = await res.json()
      setStatus(data.ok ? "ok" : "error")
    } catch {
      setStatus("error")
    } finally {
      setSaving(false)
      setTimeout(() => setStatus("idle"), 3000)
    }
  }

  if (loading) return (
    <div className="flex items-center gap-3 text-[#8B6E64] py-10">
      <RefreshCw className="w-5 h-5 animate-spin" />
      <span>Cargando configuración...</span>
    </div>
  )

  return (
    <div className="bg-white rounded-2xl border border-[#EDD5CF]/60 shadow-sm p-8 space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-[#2D1A14] mb-1">Descuento activo</h2>
        <p className="text-sm text-[#8B6E64]">
          Este descuento se muestra en el banner, el hero y el carrito. Los cambios se reflejan de inmediato.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 font-medium text-[#2D1A14]">
            <Percent className="w-4 h-4 text-[#C4958A]" />
            Porcentaje de descuento
          </label>
          <span className="text-3xl font-bold text-[#C4958A]">{discount}%</span>
        </div>
        <input
          type="range" min={5} max={50} step={5} value={discount}
          onChange={(e) => setDiscount(Number(e.target.value))}
          className="w-full h-2 bg-[#EDD5CF] rounded-full appearance-none cursor-pointer accent-[#C4958A]"
        />
        <div className="flex justify-between text-xs text-[#8B6E64]">
          {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((v) => (
            <button
              key={v}
              onClick={() => setDiscount(v)}
              className={`px-2 py-1 rounded-full transition-colors ${
                discount === v ? "bg-[#C4958A] text-white font-semibold" : "hover:bg-[#EDD5CF]"
              }`}
            >
              {v}%
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 font-medium text-[#2D1A14]">
          <Tag className="w-4 h-4 text-[#C4958A]" />
          Código de descuento
        </label>
        <input
          type="text" value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={30}
          className="w-full px-4 py-3 rounded-xl border border-[#EDD5CF] bg-[#FAF8F5] font-mono font-bold text-[#2D1A14] tracking-wider text-lg focus:outline-none focus:ring-2 focus:ring-[#C4958A]/40"
          placeholder="BIENVENIDA10"
        />
      </div>

      <div className="bg-[#2D1A14] text-white rounded-xl px-4 py-3 text-sm">
        <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Vista previa del banner</p>
        <p>
          Código{" "}
          <span className="font-bold text-[#C4958A] tracking-wider">{code}</span>
          {" "}→ {discount}% OFF
        </p>
      </div>

      <button
        onClick={save} disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-[#2D1A14] hover:bg-[#3D2A24] text-white font-semibold py-3.5 px-6 rounded-xl transition-colors disabled:opacity-60"
      >
        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? "Guardando..." : "Guardar cambios"}
      </button>

      {status === "ok" && (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-3 rounded-xl text-sm font-medium">
          <CheckCircle className="w-4 h-4" />
          ¡Cambios guardados! La tienda se actualizó automáticamente.
        </div>
      )}
      {status === "error" && (
        <div className="flex items-center gap-2 text-red-700 bg-red-50 px-4 py-3 rounded-xl text-sm font-medium">
          <AlertCircle className="w-4 h-4" />
          Error al guardar. Verifica la conexión e intenta de nuevo.
        </div>
      )}
    </div>
  )
}

// ─── Orders Tab ───────────────────────────────────────────────────────────────
function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [updating, setUpdating] = useState<string | null>(null)
  const [editTracking, setEditTracking] = useState<Record<string, string>>({})

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/orders")
      if (res.ok) {
        const data = await res.json()
        setOrders(data)
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const updateOrder = async (id: string, payload: Record<string, unknown>) => {
    setUpdating(id)
    try {
      await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      await fetchOrders()
    } catch { /* silent */ }
    finally { setUpdating(null) }
  }

  const filtered = orders.filter((o) => {
    const matchStatus = filterStatus === "all" || o.status === filterStatus
    const matchSearch =
      !search ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      (o.customer_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (o.email ?? "").toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const fmt = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n / 100)

  const StatusIcon = ({ s }: { s: string }) => {
    if (s === "pending")   return <Clock className="w-3.5 h-3.5" />
    if (s === "confirmed") return <CheckCircle className="w-3.5 h-3.5" />
    if (s === "preparing") return <Package className="w-3.5 h-3.5" />
    if (s === "shipped")   return <Truck className="w-3.5 h-3.5" />
    return <MapPin className="w-3.5 h-3.5" />
  }

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B6E64]" />
          <input
            type="text" placeholder="Buscar por ID, nombre o correo..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#EDD5CF] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#C4958A]/40"
          />
        </div>
        <div className="relative">
          <select
            value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-[#EDD5CF] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#C4958A]/40 cursor-pointer"
          >
            <option value="all">Todos los estados</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B6E64] pointer-events-none" />
        </div>
        <button
          onClick={fetchOrders}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#EDD5CF] bg-white text-sm text-[#2D1A14] hover:bg-[#FAF8F5] transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {/* Summary chips */}
      <div className="flex gap-2 flex-wrap">
        {ORDER_STATUSES.map((s) => {
          const count = orders.filter((o) => o.status === s).length
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s === filterStatus ? "all" : s)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                filterStatus === s ? STATUS_COLOR[s] + " ring-2 ring-offset-1 ring-current" : "bg-[#FAF8F5] text-[#8B6E64] hover:bg-[#EDD5CF]"
              }`}
            >
              <StatusIcon s={s} />
              {STATUS_LABELS[s]}: {count}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-[#8B6E64] py-10">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Cargando pedidos...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#8B6E64]">
          <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No hay pedidos que coincidan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <div
              key={order.id}
              className="bg-white border border-[#EDD5CF]/60 rounded-2xl p-5 space-y-4"
            >
              {/* Header row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="font-mono font-bold text-[#2D1A14]">
                    #{order.id.slice(-8).toUpperCase()}
                  </p>
                  <p className="text-xs text-[#8B6E64]">
                    {order.customer_name || "Cliente"} · {new Date(order.created_at).toLocaleDateString("es-CO")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[#2D1A14]">{fmt(order.total)}</span>
                  <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLOR[order.status]}`}>
                    <StatusIcon s={order.status} />
                    {STATUS_LABELS[order.status]}
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col sm:flex-row gap-3 pt-1 border-t border-[#EDD5CF]/50">
                {/* Status selector */}
                <div className="flex items-center gap-2 flex-1">
                  <label className="text-xs text-[#8B6E64] whitespace-nowrap">Estado:</label>
                  <div className="relative flex-1">
                    <select
                      value={order.status}
                      disabled={updating === order.id}
                      onChange={(e) => updateOrder(order.id, { status: e.target.value })}
                      className="w-full appearance-none pl-3 pr-8 py-2 rounded-xl border border-[#EDD5CF] bg-[#FAF8F5] text-sm focus:outline-none focus:ring-2 focus:ring-[#C4958A]/40 cursor-pointer"
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B6E64] pointer-events-none" />
                  </div>
                </div>

                {/* Tracking number */}
                <div className="flex items-center gap-2 flex-1">
                  <label className="text-xs text-[#8B6E64] whitespace-nowrap">Guía:</label>
                  <input
                    type="text"
                    placeholder="Número de guía"
                    value={editTracking[order.id] ?? (order.tracking_number || "")}
                    onChange={(e) => setEditTracking((p) => ({ ...p, [order.id]: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-xl border border-[#EDD5CF] bg-[#FAF8F5] text-sm focus:outline-none focus:ring-2 focus:ring-[#C4958A]/40"
                  />
                  <button
                    disabled={updating === order.id}
                    onClick={() => updateOrder(order.id, { tracking_number: editTracking[order.id] ?? order.tracking_number })}
                    className="px-3 py-2 rounded-xl bg-[#2D1A14] text-white text-xs font-semibold hover:bg-[#3D2A24] transition-colors disabled:opacity-60 whitespace-nowrap"
                  >
                    {updating === order.id ? "..." : "Guardar"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Admin Page ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const [tab, setTab] = useState<"settings" | "orders">("settings")

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Header */}
      <div className="bg-[#2D1A14] text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-wide">Panel Admin — Cliché Aromas</h1>
          <p className="text-white/50 text-sm">Gestión de la tienda</p>
        </div>
        <a
          href="/"
          className="text-sm text-white/60 hover:text-white transition-colors underline underline-offset-2"
          target="_blank"
        >
          Ver tienda →
        </a>
      </div>

      {/* Tab bar */}
      <div className="border-b border-[#EDD5CF] bg-white px-6 flex gap-1">
        <button
          onClick={() => setTab("settings")}
          className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "settings"
              ? "border-[#C4958A] text-[#2D1A14]"
              : "border-transparent text-[#8B6E64] hover:text-[#2D1A14]"
          }`}
        >
          <Settings className="w-4 h-4" />
          Configuración
        </button>
        <button
          onClick={() => setTab("orders")}
          className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "orders"
              ? "border-[#C4958A] text-[#2D1A14]"
              : "border-transparent text-[#8B6E64] hover:text-[#2D1A14]"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Pedidos
        </button>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        {tab === "settings" ? <SettingsTab /> : <OrdersTab />}
      </div>
    </div>
  )
}
