"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import {
  Users, Search, RefreshCw, Download, ShoppingBag, MailCheck, Sparkles, Loader2, AlertCircle,
} from "lucide-react"
import { adminFetch } from "@/lib/admin-client"

/**
 * Sección "Clientes" — CRM de cuentas registradas en la tienda.
 * Lista las cuentas de Supabase Auth (vía /api/admin/customers) con su
 * actividad: pedidos, total comprado, última compra y suscripción al correo.
 * Solo lectura + exportación a CSV (para campañas de correo, etc.).
 */

interface Customer {
  id: string
  email: string
  name: string | null
  phone: string | null
  birthdate: string | null
  created_at: string
  last_sign_in_at: string | null
  confirmed: boolean
  orders_count: number
  total_spent: number
  last_order_at: string | null
  subscribed: boolean
}

const money = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)

const fecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "—"

export function ClientesSection() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<"recientes" | "compras">("recientes")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminFetch("/api/admin/customers")
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || "No se pudieron cargar los clientes.")
        setCustomers([])
        return
      }
      setCustomers(Array.isArray(data.customers) ? data.customers : [])
    } catch {
      setError("Error de conexión.")
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = q
      ? customers.filter((c) =>
          (c.name || "").toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.phone || "").includes(q)
        )
      : customers
    if (sort === "compras") {
      return [...base].sort((a, b) => b.total_spent - a.total_spent || b.orders_count - a.orders_count)
    }
    return base // el API ya las entrega de más reciente a más antigua
  }, [customers, query, sort])

  const stats = useMemo(() => {
    const now = Date.now()
    return {
      total: customers.length,
      buyers: customers.filter((c) => c.orders_count > 0).length,
      subscribed: customers.filter((c) => c.subscribed).length,
      last30: customers.filter((c) => now - new Date(c.created_at).getTime() < 30 * 86400000).length,
    }
  }, [customers])

  function exportCsv() {
    const esc = (v: string | number | null) => `"${String(v ?? "").replace(/"/g, '""')}"`
    const rows = [
      ["Nombre", "Correo", "Teléfono", "Registro", "Pedidos", "Total comprado", "Última compra", "Suscrito", "Verificado"],
      ...filtered.map((c) => [
        c.name || "", c.email, c.phone || "", fecha(c.created_at),
        String(c.orders_count), String(c.total_spent), fecha(c.last_order_at),
        c.subscribed ? "Sí" : "No", c.confirmed ? "Sí" : "No",
      ]),
    ]
    // BOM para que Excel abra las tildes bien
    const csv = "﻿" + rows.map((r) => r.map(esc).join(",")).join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const a = document.createElement("a")
    a.href = url
    a.download = `clientes-cliche-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const tiles = [
    { label: "Cuentas registradas", value: stats.total, icon: Users },
    { label: "Con compras", value: stats.buyers, icon: ShoppingBag },
    { label: "Suscritas al correo", value: stats.subscribed, icon: MailCheck },
    { label: "Nuevas (30 días)", value: stats.last30, icon: Sparkles },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#2D1A14]">Clientes</h1>
          <p className="text-sm text-[#2D1A14]/50 mt-1">
            Todas las cuentas registradas en la tienda, con su actividad de compra.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="h-10 px-4 rounded-xl border border-[#2D1A14]/15 bg-white text-sm font-medium text-[#2D1A14]/70 hover:text-[#2D1A14] hover:border-[#2D1A14]/30 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Actualizar
          </button>
          <button
            onClick={exportCsv}
            disabled={loading || filtered.length === 0}
            className="h-10 px-4 rounded-xl bg-[#2D1A14] text-sm font-medium text-white hover:bg-[#3D2A24] transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#2D1A14]/8 p-4">
            <div className="flex items-center gap-2 text-[#2D1A14]/40">
              <Icon className="w-4 h-4" />
              <p className="text-[11px] font-semibold uppercase tracking-wide">{label}</p>
            </div>
            <p className="mt-2 font-serif text-3xl text-[#2D1A14]">{loading ? "—" : value}</p>
          </div>
        ))}
      </div>

      {/* Búsqueda + orden */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] flex items-center gap-2 h-11 px-4 rounded-xl border border-[#2D1A14]/15 bg-white focus-within:ring-2 focus-within:ring-[#A67163]/30">
          <Search className="w-4 h-4 text-[#2D1A14]/30 flex-shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, correo o teléfono…"
            className="w-full bg-transparent text-sm text-[#2D1A14] placeholder:text-[#2D1A14]/30 outline-none"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "recientes" | "compras")}
          className="h-11 px-3 rounded-xl border border-[#2D1A14]/15 bg-white text-sm text-[#2D1A14]/80 outline-none"
        >
          <option value="recientes">Más recientes primero</option>
          <option value="compras">Mejores clientes primero</option>
        </select>
      </div>

      {/* Estados */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#A67163]">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : filtered.length === 0 && !error ? (
        <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-10 text-center">
          <Users className="w-8 h-8 mx-auto text-[#2D1A14]/20 mb-3" />
          <p className="text-sm text-[#2D1A14]/50">
            {query ? "Ningún cliente coincide con la búsqueda." : "Todavía no hay cuentas registradas."}
          </p>
        </div>
      ) : (
        <>
          {/* Tabla (escritorio) */}
          <div className="hidden md:block bg-white rounded-2xl border border-[#2D1A14]/8 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2D1A14]/8 text-left text-[11px] uppercase tracking-wide text-[#2D1A14]/40">
                    <th className="px-5 py-3.5 font-semibold">Cliente</th>
                    <th className="px-5 py-3.5 font-semibold">Registro</th>
                    <th className="px-5 py-3.5 font-semibold text-center">Pedidos</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Total comprado</th>
                    <th className="px-5 py-3.5 font-semibold">Última compra</th>
                    <th className="px-5 py-3.5 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-b border-[#2D1A14]/5 last:border-0 hover:bg-[#FAF8F5]/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-[#2D1A14]">{c.name || "Sin nombre"}</p>
                        <p className="text-xs text-[#2D1A14]/50">{c.email}</p>
                        {c.phone && <p className="text-xs text-[#2D1A14]/40">{c.phone}</p>}
                      </td>
                      <td className="px-5 py-3.5 text-[#2D1A14]/60 whitespace-nowrap">{fecha(c.created_at)}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-block min-w-[28px] px-2 py-0.5 rounded-full text-xs font-bold ${c.orders_count > 0 ? "bg-[#A67163]/15 text-[#A67163]" : "bg-[#2D1A14]/5 text-[#2D1A14]/35"}`}>
                          {c.orders_count}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-[#2D1A14] tabular-nums whitespace-nowrap">
                        {c.total_spent > 0 ? money(c.total_spent) : <span className="text-[#2D1A14]/25">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-[#2D1A14]/60 whitespace-nowrap">{fecha(c.last_order_at)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          {c.subscribed && (
                            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold">Suscrito</span>
                          )}
                          {!c.confirmed && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold">Sin verificar</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tarjetas (móvil) */}
          <div className="md:hidden space-y-3">
            {filtered.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl border border-[#2D1A14]/8 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-[#2D1A14] truncate">{c.name || "Sin nombre"}</p>
                    <p className="text-xs text-[#2D1A14]/50 truncate">{c.email}</p>
                    {c.phone && <p className="text-xs text-[#2D1A14]/40">{c.phone}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {c.subscribed && <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold">Suscrito</span>}
                    {!c.confirmed && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold">Sin verificar</span>}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-[#2D1A14]/6 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-[#2D1A14]/35">Registro</p>
                    <p className="text-xs font-medium text-[#2D1A14]/70 mt-0.5">{fecha(c.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-[#2D1A14]/35">Pedidos</p>
                    <p className="text-xs font-bold text-[#2D1A14] mt-0.5">{c.orders_count}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-[#2D1A14]/35">Total</p>
                    <p className="text-xs font-bold text-[#2D1A14] mt-0.5">{c.total_spent > 0 ? money(c.total_spent) : "—"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-[#2D1A14]/35">
            {filtered.length} {filtered.length === 1 ? "cuenta" : "cuentas"}
            {query ? " (filtradas)" : ""} · Los pedidos de invitado se vinculan por correo a la cuenta.
          </p>
        </>
      )}
    </div>
  )
}
