"use client"

import { useState, useEffect, useCallback } from "react"
// supabase anon client only used for mutations (settings save, order status update)
import { supabase } from "@/lib/supabase"
import { getSupabaseBrowser } from "@/lib/supabase/client"
import {
  LayoutDashboard, TrendingUp, BarChart3, Star, ShoppingBag, Zap,
  Package, Settings, Lock, RefreshCw, AlertCircle, Eye, LogOut, Menu, X, Paintbrush, Flame, Ticket, MessageCircle, Users, Search,
} from "lucide-react"
import type { Product } from "@/lib/supabase"
import { Order, PageView } from "./types"
import { adminFetch } from "@/lib/admin-client"

// Sections
import { OverviewSection } from "./sections/overview"
import { VentasSection } from "./sections/ventas"
import { TraficoSection } from "./sections/trafico"
import { ProductosStatsSection } from "./sections/productos-stats"
import { PedidosSection } from "./sections/pedidos"
import { InventarioSection } from "./sections/inventario"
import { HeatmapsSection } from "./sections/heatmaps"
import { DescuentosSection } from "./sections/descuentos"
import { AsistenteSection } from "./sections/asistente"
import { ClientesSection } from "./sections/clientes"
import { SeoSection } from "./sections/seo"
import { ChatAyuda } from "./components/chat-ayuda"

type SectionId = "resumen" | "ventas" | "trafico" | "productos-stats" | "heatmaps" | "pedidos" | "clientes" | "descuentos" | "inventario" | "seo" | "asistente"

interface Setting { key: string; value: string }

const SIDEBAR = [
  { section: "GENERAL", items: [
    { id: "resumen", label: "Resumen", icon: LayoutDashboard },
  ]},
  { section: "ANALÍTICAS", items: [
    { id: "ventas",          label: "Ventas",    icon: TrendingUp },
    { id: "trafico",         label: "Tráfico",   icon: BarChart3 },
    { id: "productos-stats", label: "Productos", icon: Star },
    { id: "heatmaps",        label: "Mapas de Calor", icon: Flame },
  ]},
  { section: "OPERACIONES", items: [
    { id: "pedidos",   label: "Pedidos",              icon: ShoppingBag },
    { id: "clientes",  label: "Clientes",             icon: Users },
    { id: "descuentos", label: "Códigos de descuento", icon: Ticket },
  ]},
  { section: "ASISTENTE", items: [
    { id: "asistente", label: "Asistente WhatsApp", icon: MessageCircle },
  ]},
  { section: "CONFIGURACIÓN", items: [
    { id: "inventario", label: "Inventario", icon: Package },
    { id: "seo",        label: "SEO",        icon: Search },
  ]},
] as const

export default function AdminPage() {
  // Acceso en 2 factores: sesión de una cuenta admin (login aquí mismo si no
  // hay sesión) + código OTP de 6 dígitos enviado a su correo. Quién es admin
  // lo deciden SOLO las envs ADMIN_EMAIL/ADMIN_EMAILS en el servidor. Una
  // sesión de cuenta no-admin es devuelta a la tienda sin ver nada del panel.
  const [gate, setGate] = useState<"checking" | "login" | "otp" | "unlocked">("checking")
  const [otpInput, setOtpInput] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [authError, setAuthError] = useState("")
  const [authLoading, setAuthLoading] = useState(false)
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const authed = gate === "unlocked"

  const [activeSection, setActiveSection] = useState<SectionId>("resumen")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [pageViews, setPageViews] = useState<PageView[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Al entrar: preguntar al servidor quién es el visitante.
  //  - Cookie admin válida → panel.
  //  - Cuenta admin sin desbloquear → pedir el código de 6 dígitos.
  //  - Sin sesión → login AQUÍ MISMO (el panel no depende del menú de la
  //    tienda ni de una sesión previa; el permiso lo decide solo el servidor
  //    contra ADMIN_EMAIL/ADMIN_EMAILS).
  //  - Sesión de una cuenta que NO es admin → a la tienda (sin pistas).
  useEffect(() => {
    adminFetch("/api/admin/whoami")
      .then((r) => r.json())
      .then((d: { authenticated: boolean; isAdminEmail: boolean; unlocked: boolean }) => {
        if (d.unlocked) { setGate("unlocked"); return }
        if (d.authenticated && d.isAdminEmail) { setGate("otp"); return }
        if (!d.authenticated) { setGate("login"); return }
        window.location.replace("/")
      })
      .catch(() => {
        // Fallo transitorio (red, respuesta no-JSON): no expulsar a la dueña
        // a la tienda; se muestra el login con aviso para reintentar. La
        // pantalla de login no revela nada del panel a un extraño.
        setAuthError("No se pudo verificar el acceso. Recarga o intenta de nuevo.")
        setGate("login")
      })
  }, [])

  // Login propio del panel: entra con correo + contraseña y se re-verifica en
  // el servidor. Si la cuenta no es admin, se cierra la sesión recién creada y
  // se devuelve a la tienda (aquí no entra nadie que no esté en la lista).
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError("")
    try {
      const { error } = await getSupabaseBrowser().auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      })
      if (error) {
        setAuthError(/confirm/i.test(error.message) ? "Verifica tu correo antes de iniciar sesión." : "Correo o contraseña incorrectos.")
        return
      }
      const who = await adminFetch("/api/admin/whoami").then((r) => r.json()).catch(() => null)
      if (who?.authenticated && who?.isAdminEmail) { setGate("otp"); return }
      if (!who?.authenticated) {
        // El login funcionó pero la verificación no respondió (red/transitorio):
        // avisar y dejar reintentar, en vez de expulsar en silencio.
        setAuthError("No se pudo verificar el acceso. Intenta de nuevo.")
        return
      }
      // Sesión válida pero la cuenta NO es admin: fuera, sin pistas del panel.
      await getSupabaseBrowser().auth.signOut({ scope: "local" }).catch(() => {})
      window.location.replace("/")
    } catch {
      setAuthError("Error de conexión")
    } finally {
      setAuthLoading(false)
    }
  }

  async function requestCode() {
    setAuthLoading(true)
    setAuthError("")
    try {
      const res = await adminFetch("/api/admin/otp/request", { method: "POST" })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "" }))
        setAuthError(error || "No se pudo enviar el código")
        return
      }
      setOtpSent(true)
    } catch {
      setAuthError("Error de conexión")
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    if (!/^\d{6}$/.test(otpInput)) { setAuthError("Escribe los 6 dígitos"); return }
    setAuthLoading(true)
    setAuthError("")
    try {
      const res = await adminFetch("/api/admin/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: otpInput }),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "" }))
        setAuthError(error || "Código incorrecto")
        return
      }
      setGate("unlocked")
    } catch {
      setAuthError("Error de conexión")
    } finally {
      setAuthLoading(false)
    }
  }

  function handleLogout() {
    adminFetch("/api/admin/logout", { method: "POST" }).finally(() => window.location.replace("/"))
  }

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      // Use service-role API route — anon client cannot read orders/page_views (RLS)
      const res = await adminFetch("/api/admin/data")
      if (res.status === 401) { setGate("otp"); setOtpSent(false); return }
      if (!res.ok) {
        // Degradar con elegancia: el panel queda usable con datos vacíos en lugar
        // de romper la UI. (Ocurre p. ej. sin SUPABASE_SERVICE_ROLE_KEY en local.)
        const { error } = await res.json().catch(() => ({ error: "" }))
        setLoadError(error || "No se pudieron cargar los datos del panel.")
        setOrders([]); setProducts([]); setPageViews([])
        return
      }
      setLoadError(null)
      const { orders: ords, products: prods, settings: setts, pageViews: views } = await res.json()
      setOrders(ords || [])
      setProducts(prods || [])
      setPageViews(views || [])
      const map: Record<string, string> = {}
      ;(setts || []).forEach((s: Setting) => { map[s.key] = s.value })
      setSettings(map)
    } catch {
      // Fallo de red/parseo: dejar el panel utilizable con datos vacíos.
      setLoadError("No se pudieron cargar los datos del panel.")
      setOrders([]); setProducts([]); setPageViews([])
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

  // Badges: pedidos que requieren acción (pagados, sin despachar) + productos con stock bajo
  const pendingFulfillment = orders.filter(o => ["confirmed", "preparing", "paid"].includes(o.status)).length
  const lowStock = products.filter(p => typeof p.stock === "number" && p.stock <= 5).length
  const navBadges: Record<string, { count: number; tone: "danger" | "accent" } | undefined> = {
    pedidos: pendingFulfillment > 0 ? { count: pendingFulfillment, tone: "accent" } : undefined,
    inventario: lowStock > 0 ? { count: lowStock, tone: "danger" } : undefined,
  }

  // ── VERIFICANDO IDENTIDAD ──────────────────────────────────────────────────
  if (gate === "checking") {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <RefreshCw className="w-7 h-7 animate-spin text-[#A67163]" />
      </div>
    )
  }

  // ── INICIAR SESIÓN (1er factor, dentro del propio panel) ───────────────────
  if (gate === "login") {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-[#2D1A14] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-[#2D1A14]">Iniciar sesión</h1>
            <p className="text-sm text-[#2D1A14]/50 mt-1">Acceso restringido</p>
          </div>
          <form onSubmit={handleLogin} className="bg-white rounded-2xl border border-[#2D1A14]/10 p-6 shadow-sm space-y-4">
            <input
              type="email"
              autoComplete="email"
              value={loginEmail}
              onChange={e => setLoginEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#2D1A14]/15 bg-[#FAF8F5] text-[#2D1A14] focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
              placeholder="Correo"
              autoFocus
              required
            />
            <input
              type="password"
              autoComplete="current-password"
              value={loginPassword}
              onChange={e => setLoginPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#2D1A14]/15 bg-[#FAF8F5] text-[#2D1A14] focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
              placeholder="Contraseña"
              required
            />
            <button
              type="submit"
              disabled={authLoading || !loginEmail || !loginPassword}
              className="w-full h-12 rounded-xl bg-[#2D1A14] hover:bg-[#3D2A24] text-white font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              Continuar
            </button>
            {authError && (
              <p className="text-xs text-red-600 flex items-center justify-center gap-1">
                <AlertCircle className="w-3 h-3" /> {authError}
              </p>
            )}
          </form>
        </div>
      </div>
    )
  }

  // ── CÓDIGO DE SEGURIDAD (2º factor) ────────────────────────────────────────
  if (gate === "otp") {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-[#2D1A14] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-[#2D1A14]">Código de seguridad</h1>
            <p className="text-sm text-[#2D1A14]/50 mt-1">Panel admin · Cliché Colombia</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#2D1A14]/10 p-6 shadow-sm space-y-4">
            {!otpSent ? (
              <>
                <p className="text-sm text-[#2D1A14]/70 text-center">
                  Por tu seguridad, te enviaremos un código de <b>6 dígitos</b> a tu correo de administradora.
                </p>
                <button
                  onClick={requestCode}
                  disabled={authLoading}
                  className="w-full h-12 rounded-xl bg-[#2D1A14] hover:bg-[#3D2A24] text-white font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Enviarme el código
                </button>
              </>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <p className="text-sm text-[#2D1A14]/70 text-center">
                  Revisa tu correo: te enviamos un código de 6 dígitos. Vence en 10 minutos.
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otpInput}
                  onChange={e => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full px-4 py-3 rounded-xl border border-[#2D1A14]/15 bg-[#FAF8F5] text-[#2D1A14] text-center text-2xl font-bold tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
                  placeholder="······"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={authLoading || otpInput.length !== 6}
                  className="w-full h-12 rounded-xl bg-[#2D1A14] hover:bg-[#3D2A24] text-white font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Verificar y entrar
                </button>
                <button
                  type="button"
                  onClick={requestCode}
                  disabled={authLoading}
                  className="w-full text-xs text-[#2D1A14]/50 hover:text-[#A67163] transition-colors"
                >
                  ¿No te llegó? Reenviar código
                </button>
              </form>
            )}
            {authError && (
              <p className="text-xs text-red-600 flex items-center justify-center gap-1">
                <AlertCircle className="w-3 h-3" /> {authError}
              </p>
            )}
          </div>
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
                {group.items.map(({ id, label, icon: Icon }) => {
                  const badge = navBadges[id]
                  const active = activeSection === id
                  return (
                    <button
                      key={id}
                      onClick={() => navigate(id as SectionId)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                        active
                          ? "bg-[#2D1A14] text-white"
                          : "text-[#2D1A14]/60 hover:bg-[#2D1A14]/5 hover:text-[#2D1A14]"
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1">{label}</span>
                      {badge ? (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                          active ? "bg-white/20 text-white" : badge.tone === "danger" ? "bg-red-100 text-red-600" : "bg-[#A67163]/15 text-[#A67163]"
                        }`}>
                          {badge.count}
                        </span>
                      ) : null}
                    </button>
                  )
                })}
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
            rel="noopener noreferrer"
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
          {loadError && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <span className="text-base leading-none">⚠️</span>
              <div>
                <p className="font-semibold">No se pudieron cargar los datos en vivo</p>
                <p className="text-amber-800/80">{loadError} El panel sigue siendo usable; los datos aparecerán cuando la conexión esté disponible.</p>
              </div>
            </div>
          )}
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
          {activeSection === "heatmaps" && (
            <HeatmapsSection pageViews={pageViews} />
          )}
          {activeSection === "pedidos" && (
            <PedidosSection orders={orders} products={products} onOrdersUpdate={handleOrderUpdate} />
          )}
          {activeSection === "clientes" && (
            <ClientesSection />
          )}
          {activeSection === "descuentos" && (
            <DescuentosSection />
          )}
          {activeSection === "inventario" && (
            <InventarioSection products={products} onRefresh={loadAll} />
          )}
          {activeSection === "seo" && (
            <SeoSection products={products} />
          )}
          {activeSection === "asistente" && (
            <AsistenteSection />
          )}
        </main>
      </div>

      {/* Ayuda con IA: burbuja flotante, disponible en todas las secciones */}
      <ChatAyuda />
    </div>
  )
}
