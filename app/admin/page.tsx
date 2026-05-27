"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import {
  Percent, Tag, Save, CheckCircle, AlertCircle, RefreshCw,
  ShoppingBag, Clock, Truck, Package, MapPin, ChevronDown, Search,
  Settings, Trash2, ToggleLeft, ToggleRight
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

// ─── Discount Codes Tab ────────────────────────────────────────────────────────
interface DiscountCode {
  id: string
  code: string
  type: "percentage" | "fixed"
  value: number
  max_uses: number | null
  uses_count: number
  expires_at: string | null
  is_active: boolean
  created_at: string
}

function DiscountCodesTab({ password }: { password: string }) {
  const [codes, setCodes] = useState<DiscountCode[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ code: "", type: "percentage", value: "", max_uses: "", expires_at: "" })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const headers = { "x-admin-password": password, "Content-Type": "application/json" }

  const fetchCodes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/discount-codes", { headers: { "x-admin-password": password } })
      if (res.ok) setCodes(await res.json())
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [password])

  useEffect(() => { fetchCodes() }, [fetchCodes])

  const toggleActive = async (code: DiscountCode) => {
    await fetch(`/api/admin/discount-codes/${code.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ is_active: !code.is_active }),
    })
    await fetchCodes()
  }

  const deleteCode = async (id: string) => {
    setDeleting(id)
    try {
      await fetch(`/api/admin/discount-codes/${id}`, { method: "DELETE", headers })
      await fetchCodes()
    } catch { /* silent */ }
    finally { setDeleting(null) }
  }

  const createCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await fetch("/api/admin/discount-codes", {
        method: "POST",
        headers,
        body: JSON.stringify({
          code: formData.code,
          type: formData.type,
          value: Number(formData.value),
          max_uses: formData.max_uses ? Number(formData.max_uses) : null,
          expires_at: formData.expires_at || null,
          is_active: true,
        }),
      })
      setFormData({ code: "", type: "percentage", value: "", max_uses: "", expires_at: "" })
      setShowForm(false)
      await fetchCodes()
    } catch { /* silent */ }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#2D1A14]">Códigos de descuento</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-[#2D1A14] text-white text-sm font-medium rounded-xl hover:bg-[#3D2A24] transition-colors"
        >
          {showForm ? "Cancelar" : "+ Nuevo código"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createCode} className="bg-white border border-[#EDD5CF]/60 rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold text-[#2D1A14] mb-2">Crear nuevo código</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#8B6E64] mb-1 block">Código</label>
              <input required value={formData.code} onChange={e => setFormData(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="PROMO20" className="w-full px-3 py-2 border border-[#EDD5CF] rounded-xl text-sm font-mono font-bold text-[#2D1A14] focus:outline-none focus:ring-2 focus:ring-[#C4958A]/40" />
            </div>
            <div>
              <label className="text-xs text-[#8B6E64] mb-1 block">Tipo</label>
              <select value={formData.type} onChange={e => setFormData(p => ({ ...p, type: e.target.value }))}
                className="w-full px-3 py-2 border border-[#EDD5CF] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C4958A]/40">
                <option value="percentage">Porcentaje (%)</option>
                <option value="fixed">Fijo (COP)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[#8B6E64] mb-1 block">Valor</label>
              <input required type="number" min="0" value={formData.value} onChange={e => setFormData(p => ({ ...p, value: e.target.value }))}
                placeholder={formData.type === "percentage" ? "20" : "15000"} className="w-full px-3 py-2 border border-[#EDD5CF] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4958A]/40" />
            </div>
            <div>
              <label className="text-xs text-[#8B6E64] mb-1 block">Usos máximos (opcional)</label>
              <input type="number" min="1" value={formData.max_uses} onChange={e => setFormData(p => ({ ...p, max_uses: e.target.value }))}
                placeholder="∞" className="w-full px-3 py-2 border border-[#EDD5CF] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4958A]/40" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-[#8B6E64] mb-1 block">Fecha de vencimiento (opcional)</label>
              <input type="datetime-local" value={formData.expires_at} onChange={e => setFormData(p => ({ ...p, expires_at: e.target.value }))}
                className="w-full px-3 py-2 border border-[#EDD5CF] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C4958A]/40" />
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-[#A67163] text-white font-semibold py-3 rounded-xl hover:bg-[#8B5E52] transition-colors disabled:opacity-60">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Guardando..." : "Crear código"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex items-center gap-3 text-[#8B6E64] py-10">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Cargando códigos...</span>
        </div>
      ) : codes.length === 0 ? (
        <div className="text-center py-16 text-[#8B6E64]">
          <Tag className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No hay códigos de descuento</p>
        </div>
      ) : (
        <div className="bg-white border border-[#EDD5CF]/60 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#FAF8F5] text-[#8B6E64] text-xs uppercase tracking-widest">
              <tr>
                <th className="px-5 py-3 text-left">Código</th>
                <th className="px-5 py-3 text-left">Tipo / Valor</th>
                <th className="px-5 py-3 text-left">Usos</th>
                <th className="px-5 py-3 text-left">Vence</th>
                <th className="px-5 py-3 text-center">Activo</th>
                <th className="px-5 py-3 text-center">Eliminar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDD5CF]/40">
              {codes.map((c) => (
                <tr key={c.id} className="hover:bg-[#FAF8F5]/50">
                  <td className="px-5 py-3.5">
                    <span className="font-mono font-bold text-[#2D1A14] tracking-widest">{c.code}</span>
                  </td>
                  <td className="px-5 py-3.5 text-[#8B6E64]">
                    {c.type === "percentage" ? `${c.value}%` : `$${c.value.toLocaleString("es-CO")}`}
                  </td>
                  <td className="px-5 py-3.5 text-[#8B6E64]">
                    {c.uses_count} / {c.max_uses ?? "∞"}
                  </td>
                  <td className="px-5 py-3.5 text-[#8B6E64]">
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString("es-CO") : "Sin límite"}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button onClick={() => toggleActive(c)} className="text-[#2D1A14] hover:text-[#A67163] transition-colors">
                      {c.is_active
                        ? <ToggleRight className="w-6 h-6 text-green-500 mx-auto" />
                        : <ToggleLeft className="w-6 h-6 text-[#2D1A14]/25 mx-auto" />}
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button onClick={() => deleteCode(c.id)} disabled={deleting === c.id}
                      className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-40 mx-auto">
                      {deleting === c.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Stock Tab ────────────────────────────────────────────────────────────────
interface AdminProduct {
  id: string
  name: string
  price: number
  stock: number
  image_url: string
}

function StockTab({ password }: { password: string }) {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [editStock, setEditStock] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  const headers = { "x-admin-password": password, "Content-Type": "application/json" }

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/products", { headers: { "x-admin-password": password } })
      if (res.ok) setProducts(await res.json())
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [password])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const saveStock = async (id: string) => {
    const stock = editStock[id]
    if (stock === undefined) return
    setSaving(id)
    try {
      await fetch(`/api/admin/products/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ stock: Number(stock) }),
      })
      setSaved(id)
      setTimeout(() => setSaved(null), 2000)
      await fetchProducts()
    } catch { /* silent */ }
    finally { setSaving(null) }
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#2D1A14]">Gestión de stock</h2>
        <button onClick={fetchProducts} className="flex items-center gap-2 px-4 py-2 border border-[#EDD5CF] bg-white text-sm text-[#2D1A14] rounded-xl hover:bg-[#FAF8F5] transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-[#8B6E64] py-10">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Cargando productos...</span>
        </div>
      ) : (
        <div className="bg-white border border-[#EDD5CF]/60 rounded-2xl divide-y divide-[#EDD5CF]/40">
          {products.map((p) => {
            const currentStock = editStock[p.id] !== undefined ? Number(editStock[p.id]) : p.stock
            const isLow = currentStock <= 5
            return (
              <div key={p.id} className="flex items-center gap-4 px-5 py-4">
                <div className="relative w-10 h-10 flex-shrink-0 overflow-hidden rounded-lg bg-[#EDD5CF]/30">
                  {p.image_url && (
                    <Image src={p.image_url} alt={p.name} fill className="object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#2D1A14] text-sm truncate">{p.name}</p>
                  <p className="text-xs text-[#8B6E64]">{fmt(p.price)}</p>
                </div>
                {isLow && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${currentStock === 0 ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"}`}>
                    {currentStock === 0 ? "Sin stock" : "Bajo stock"}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="0"
                    value={editStock[p.id] ?? p.stock}
                    onChange={e => setEditStock(prev => ({ ...prev, [p.id]: e.target.value }))}
                    className="w-20 px-3 py-1.5 border border-[#EDD5CF] rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#C4958A]/40"
                  />
                  <button
                    onClick={() => saveStock(p.id)}
                    disabled={saving === p.id || editStock[p.id] === undefined}
                    className="px-3 py-1.5 bg-[#2D1A14] text-white text-xs font-semibold rounded-xl hover:bg-[#3D2A24] transition-colors disabled:opacity-40"
                  >
                    {saving === p.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : saved === p.id ? <CheckCircle className="w-3 h-3 text-green-400" /> : "Guardar"}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main Admin Page ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const [tab, setTab] = useState<"settings" | "orders" | "codes" | "stock">("settings")
  const [password, setPassword] = useState("")
  const [inputPwd, setInputPwd] = useState("")
  const [pwdError, setPwdError] = useState("")
  const [pwdLoading, setPwdLoading] = useState(false)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = localStorage.getItem("cliche-admin-pwd")
    if (stored) {
      setPassword(stored)
      setAuthed(true)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwdLoading(true)
    setPwdError("")
    try {
      const res = await fetch("/api/admin/discount-codes", {
        headers: { "x-admin-password": inputPwd },
      })
      if (res.ok) {
        localStorage.setItem("cliche-admin-pwd", inputPwd)
        setPassword(inputPwd)
        setAuthed(true)
      } else {
        setPwdError("Contraseña incorrecta")
      }
    } catch {
      setPwdError("Error de conexión. Intenta de nuevo.")
    } finally {
      setPwdLoading(false)
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center px-4">
        <div className="bg-white border border-[#EDD5CF]/60 rounded-2xl shadow-sm p-8 w-full max-w-sm space-y-5">
          <div className="text-center">
            <h1 className="font-serif text-2xl font-light text-[#2D1A14] mb-1">Panel Admin</h1>
            <p className="text-sm text-[#8B6E64]">Cliché Aromas</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="Contraseña de administrador"
              value={inputPwd}
              onChange={e => setInputPwd(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#EDD5CF] bg-[#FAF8F5] text-[#2D1A14] focus:outline-none focus:ring-2 focus:ring-[#C4958A]/40 text-sm"
            />
            {pwdError && <p className="text-red-500 text-xs">{pwdError}</p>}
            <button type="submit" disabled={pwdLoading || !inputPwd}
              className="w-full flex items-center justify-center gap-2 bg-[#2D1A14] text-white font-semibold py-3 rounded-xl hover:bg-[#3D2A24] transition-colors disabled:opacity-60">
              {pwdLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
    )
  }

  const TABS = [
    { id: "settings", label: "Configuración", icon: Settings },
    { id: "orders",   label: "Pedidos",       icon: ShoppingBag },
    { id: "codes",    label: "Códigos",        icon: Tag },
    { id: "stock",    label: "Stock",          icon: Package },
  ] as const

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
      <div className="border-b border-[#EDD5CF] bg-white px-6 flex gap-1 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === id
                ? "border-[#C4958A] text-[#2D1A14]"
                : "border-transparent text-[#8B6E64] hover:text-[#2D1A14]"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        {tab === "settings" && <SettingsTab />}
        {tab === "orders"   && <OrdersTab />}
        {tab === "codes"    && <DiscountCodesTab password={password} />}
        {tab === "stock"    && <StockTab password={password} />}
      </div>
    </div>
  )
}
