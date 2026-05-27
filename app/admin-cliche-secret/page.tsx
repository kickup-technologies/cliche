"use client"

import { useState, useEffect, useCallback } from "react"
// supabase anon client only used for mutations (settings save, order status update)
import { supabase } from "@/lib/supabase"
import {
  LayoutDashboard, TrendingUp, BarChart3, Star, ShoppingBag, Zap,
  Package, Settings, Lock, RefreshCw, AlertCircle, Eye, LogOut, Menu, X,
} from "lucide-react"
import type { Product } from "@/lib/supabase"
import { Order, PageView } from "./types"

// Sections
import { OverviewSection } from "./sections/overview"
import { VentasSection } from "./sections/ventas"
import { TraficoSection } from "./sections/trafico"
import { ProductosStatsSection } from "./sections/productos-stats"
import { PedidosSection } from "./sections/pedidos"
import { UrgenciaSection } from "./sections/urgencia"
import { InventarioSection } from "./sections/inventario"
import { TiendaSection } from "./sections/tienda"

type SectionId = "resumen" | "ventas" | "trafico" | "productos-stats" | "pedidos" | "urgencia" | "inventario" | "tienda"

interface Setting { key: string; value: string }

const SIDEBAR = [
  { section: "GENERAL", items: [
    { id: "resumen", label: "Resumen", icon: LayoutDashboard },
  ]},
  { section: "ANALÍTICAS", items: [
    { id: "ventas",          label: "Ventas",    icon: TrendingUp },
    { id: "trafico",         label: "Tráfico",   icon: BarChart3 },
    { id: "productos-stats", label: "Productos", icon: Star },
  ]},
  { section: "OPERACIONES", items: [
    { id: "pedidos",  label: "Pedidos",              icon: ShoppingBag },
    { id: "urgencia", label: "Urgencia Inteligente", icon: Zap },
  ]},
  { section: "CONFIGURACIÓN", items: [
    { id: "inventario", label: "Inventario", icon: Package },
    { id: "tienda",     label: "Tienda",     icon: Settings },
  ]},
] as const

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pwInput, setPwInput] = useState("")
  const [authError, setAuthError] = useState("")
  const [authLoading, setAuthLoading] = useState(false)

  const [activeSection, setActiveSection] = useState<SectionId>("resumen")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [pageViews, setPageViews] = useState<PageView[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  // Check session on mount
  useEffect(() => {
    const token = sessionStorage.getItem("cliche_admin_auth")
    if (token === "ok") setAuthed(true)
  }, [])

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

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      // Use service-role API route — anon client cannot read orders/page_views (RLS)
      const res = await fetch("/api/admin/data")
      if (!res.ok) throw new Error("Failed to load admin data")
      const { orders: ords, products: prods, settings: setts, pageViews: views } = await res.json()
      setOrders(ords || [])
      setProducts(prods || [])
      setPageViews(views || [])
      const map: Record<string, string> = {}
      ;(setts || []).forEach((s: Setting) => { map[s.key] = s.value })
      setSettings(map)
    } catch (err) {
      console.error("[admin] loadAll failed:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (authed) loadAll() }, [authed, loadAll])

  function handleOrderUpdate(updated: Order) {
    setOrders(prev => prev.map(o => o.id === updated.id ? updated : o))
  }

  function navigate(id: SectionId) {
    setActiveSection(id)
    setSidebarOpen(false)
  }

  // ── LOGIN ──────────────────────────────────────────────────────────────────
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
              <label className="block text-xs font-semibold uppercase tracking-widest text-[#2D1A14]/50 mb-2">Contraseña</label>
              <input
                type="password"
                value={pwInput}
                onChange={e => setPwInput(e.target.value)}
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
            <button
              type="submit"
              disabled={authLoading}
              className="w-full h-12 rounded-xl bg-[#2D1A14] hover:bg-[#3D2A24] text-white font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              Ingresar
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── LOADING ────────────────────────────────────────────────────────────────
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

  // ── MAIN LAYOUT ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FAF8F5] flex">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-[#2D1A14]/8 z-40 flex flex-col transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-[#2D1A14]/8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#2D1A14] rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm font-serif">C</span>
            </div>
            <div>
              <p className="font-semibold text-[#2D1A14] text-sm leading-none">Panel Admin</p>
              <p className="text-[10px] text-[#2D1A14]/40 mt-0.5">Bienestar by Cliché</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden w-7 h-7 rounded-lg hover:bg-[#FAF8F5] flex items-center justify-center">
            <X className="w-4 h-4 text-[#2D1A14]/50" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {SIDEBAR.map(group => (
            <div key={group.section}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#2D1A14]/30 px-2 mb-1.5">{group.section}</p>
              <div className="space-y-0.5">
                {group.items.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => navigate(id as SectionId)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                      activeSection === id
                        ? "bg-[#2D1A14] text-white"
                        : "text-[#2D1A14]/60 hover:bg-[#2D1A14]/5 hover:text-[#2D1A14]"
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 border-t border-[#2D1A14]/8 space-y-1">
          <button
            onClick={loadAll}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#2D1A14]/60 hover:bg-[#2D1A14]/5 hover:text-[#2D1A14] transition-all"
          >
            <RefreshCw className="w-4 h-4" /> Actualizar datos
          </button>
          <a
            href="/"
            target="_blank"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#2D1A14]/60 hover:bg-[#2D1A14]/5 hover:text-[#2D1A14] transition-all"
          >
            <Eye className="w-4 h-4" /> Ver tienda
          </a>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#2D1A14]/60 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-20 bg-white border-b border-[#2D1A14]/8 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="w-9 h-9 rounded-xl border border-[#2D1A14]/15 flex items-center justify-center">
            <Menu className="w-4 h-4 text-[#2D1A14]" />
          </button>
          <p className="font-semibold text-[#2D1A14] text-sm">
            {(SIDEBAR.flatMap(g => [...g.items]) as Array<{ id: string; label: string; icon: unknown }>).find(i => i.id === activeSection)?.label || "Panel Admin"}
          </p>
          <button onClick={handleLogout} className="w-9 h-9 rounded-xl border border-[#2D1A14]/15 flex items-center justify-center">
            <LogOut className="w-4 h-4 text-[#2D1A14]/50" />
          </button>
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {activeSection === "resumen" && (
            <OverviewSection orders={orders} pageViews={pageViews} products={products} />
          )}
          {activeSection === "ventas" && (
            <VentasSection orders={orders} products={products} />
          )}
          {activeSection === "trafico" && (
            <TraficoSection orders={orders} pageViews={pageViews} />
          )}
          {activeSection === "productos-stats" && (
            <ProductosStatsSection orders={orders} products={products} pageViews={pageViews} />
          )}
          {activeSection === "pedidos" && (
            <PedidosSection orders={orders} onOrdersUpdate={handleOrderUpdate} />
          )}
          {activeSection === "urgencia" && (
            <UrgenciaSection orders={orders} products={products} />
          )}
          {activeSection === "inventario" && (
            <InventarioSection products={products} onRefresh={loadAll} />
          )}
          {activeSection === "tienda" && (
            <TiendaSection settings={settings} onSettingsUpdate={setSettings} />
          )}
        </main>
      </div>
    </div>
  )
}
