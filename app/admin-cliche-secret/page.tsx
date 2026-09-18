"use client"

import { useState, useEffect, useCallback, type ComponentType } from "react"
// supabase anon client only used for mutations (settings save, order status update)
import { supabase } from "@/lib/supabase"
import { getSupabaseBrowser } from "@/lib/supabase/client"
import {
  LayoutDashboard, TrendingUp, BarChart3, Star, ShoppingBag, Zap,
  Package, Settings, Lock, RefreshCw, AlertCircle, Eye, LogOut, Menu, X, Paintbrush, Flame, Ticket, MessageCircle, Users, Search, Newspaper, LayoutGrid, Store, Scale, ChevronDown,
} from "lucide-react"
import type { Product } from "@/lib/supabase"
import { Order, PageView } from "./types"
import { adminFetch } from "@/lib/admin-client"

import dynamic from "next/dynamic"
import { prefetchTiendas } from "./sections/tiendas"

// Sections CODE-SPLIT: antes TODO el panel (editor Tiptap del blog, gráficas
// Recharts, asistente, etc.) viajaba en UN solo bundle gigante — hasta que no
// bajaba y se ejecutaba, NINGÚN botón respondía (el selector de tiendas podía
// tardar minutos en conexiones lentas). Ahora cada sección se descarga solo
// al abrirla y el cascarón del panel hidrata en milisegundos.
const SectionLoading = () => (
  <div className="py-20 grid place-items-center"><RefreshCw className="w-6 h-6 animate-spin text-[#A67163]" /></div>
)
const lazy = <T,>(load: () => Promise<T>, pick: (m: T) => ComponentType<any>) =>
  dynamic(() => load().then(m => ({ default: pick(m) })), { ssr: false, loading: SectionLoading })

const OverviewSection = lazy(() => import("./sections/overview"), m => m.OverviewSection)
const VentasSection = lazy(() => import("./sections/ventas"), m => m.VentasSection)
const TraficoSection = lazy(() => import("./sections/trafico"), m => m.TraficoSection)
const ProductosStatsSection = lazy(() => import("./sections/productos-stats"), m => m.ProductosStatsSection)
const PedidosSection = lazy(() => import("./sections/pedidos"), m => m.PedidosSection)
const InventarioSection = lazy(() => import("./sections/inventario"), m => m.InventarioSection)
const HeatmapsSection = lazy(() => import("./sections/heatmaps"), m => m.HeatmapsSection)
const DescuentosSection = lazy(() => import("./sections/descuentos"), m => m.DescuentosSection)
const AsistenteSection = lazy(() => import("./sections/asistente"), m => m.AsistenteSection)
const ClientesSection = lazy(() => import("./sections/clientes"), m => m.ClientesSection)
const SeoSection = lazy(() => import("./sections/seo"), m => m.SeoSection)
const BlogsSection = lazy(() => import("./sections/blogs"), m => m.BlogsSection)
const CatalogoEditorSection = lazy(() => import("./sections/catalogo-editor"), m => m.CatalogoEditorSection)
const BienestarSection = lazy(() => import("./sections/tiendas"), m => m.BienestarSection)
const CompararTiendasSection = lazy(() => import("./sections/tiendas"), m => m.CompararTiendasSection)
const ChatAyuda = lazy(() => import("./components/chat-ayuda"), m => m.ChatAyuda)

type SectionId = "resumen" | "ventas" | "trafico" | "productos-stats" | "heatmaps" | "pedidos" | "clientes" | "descuentos" | "blogs" | "inventario" | "catalogo" | "seo" | "asistente"
// Multi-tienda: qué tienda se está administrando desde este panel.
type StoreView = "cliche" | "bienestar" | "comparar"

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
    { id: "blogs",      label: "Blog",                 icon: Newspaper },
  ]},
  { section: "ASISTENTE", items: [
    { id: "asistente", label: "Asistente WhatsApp", icon: MessageCircle },
  ]},
  { section: "CONFIGURACIÓN", items: [
    { id: "inventario", label: "Inventario", icon: Package },
    { id: "catalogo",   label: "Catálogo",   icon: LayoutGrid },
    { id: "seo",        label: "SEO",        icon: Search },
  ]},
] as const

export default function AdminPage() {
  // Acceso en 2 factores: sesión de una cuenta admin (login aquí mismo si no
  // hay sesión) + código OTP de 6 dígitos enviado a su correo. Quién es admin
  // lo deciden SOLO las envs ADMIN_EMAIL/ADMIN_EMAILS en el servidor. Una
  // sesión de cuenta no-admin es devuelta a la tienda sin ver nada del panel.
  // Optimista: si esta pestaña ya estuvo desbloqueada, el panel pinta DE UNA
  // (con el snapshot) mientras whoami re-verifica en segundo plano. El
  // servidor sigue mandando: cualquier API sin cookie válida responde 401 y
  // el panel vuelve al login. Solo cambia qué se muestra mientras tanto.
  const wasUnlocked = typeof window !== "undefined" && (() => { try { return sessionStorage.getItem("cliche_admin_unlocked") === "1" } catch { return false } })()
  const [gate, setGate] = useState<"checking" | "login" | "otp" | "unlocked">(wasUnlocked ? "unlocked" : "checking")
  const [otpInput, setOtpInput] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [authError, setAuthError] = useState("")
  const [authLoading, setAuthLoading] = useState(false)
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const authed = gate === "unlocked"

  const [activeSection, setActiveSection] = useState<SectionId>("resumen")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [storeView, setStoreView] = useState<StoreView>("cliche")
  const [storeDdOpen, setStoreDdOpen] = useState(false)

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
      .then((d: { authenticated: boolean; isAdminEmail: boolean; otpSkip?: boolean; unlocked: boolean }) => {
        try { sessionStorage.setItem("cliche_admin_unlocked", d.unlocked ? "1" : "0") } catch {}
        if (d.unlocked) { setGate("unlocked"); return }
        // Admin exento del código (admin_otp_skip): desbloqueo automático —
        // requestCode responde skipped y entra directo, sin pedir nada.
        if (d.authenticated && d.isAdminEmail && d.otpSkip) { setGate("otp"); void requestCode(); return }
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
      if (who?.authenticated && who?.isAdminEmail && who?.otpSkip) { setGate("otp"); void requestCode(); return }
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
      const data = (await res.json().catch(() => ({}))) as { skipped?: boolean }
      // Correo exento del 2º factor: la cookie de acceso ya viene puesta.
      if (data.skipped) { try { sessionStorage.setItem("cliche_admin_unlocked", "1") } catch {}; setGate("unlocked"); return }
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
      try { sessionStorage.setItem("cliche_admin_unlocked", "1") } catch {}
      setGate("unlocked")
    } catch {
      setAuthError("Error de conexión")
    } finally {
      setAuthLoading(false)
    }
  }

  function handleLogout() {
    try { sessionStorage.removeItem("cliche_admin_unlocked"); sessionStorage.removeItem("cliche_admin_snapshot_v1") } catch {}
    adminFetch("/api/admin/logout", { method: "POST" }).finally(() => window.location.replace("/"))
  }

  // ── Snapshot instantáneo ──────────────────────────────────────────────────
  // La última foto de los datos queda en sessionStorage: al reabrir el panel
  // pinta AL INSTANTE con ella y se refresca en segundo plano. La pantalla
  // "Cargando datos..." solo aparece la primera vez en la pestaña.
  const SNAP_KEY = "cliche_admin_snapshot_v1"

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
      try {
        sessionStorage.setItem(SNAP_KEY, JSON.stringify({ orders: ords || [], products: prods || [], pageViews: views || [], settings: map }))
      } catch { /* storage lleno o bloqueado: sin snapshot, sin drama */ }
    } catch {
      // Fallo de red/parseo: dejar el panel utilizable con datos vacíos.
      setLoadError("No se pudieron cargar los datos del panel.")
      setOrders([]); setProducts([]); setPageViews([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Hidratar del snapshot ANTES del fetch: apertura instantánea.
  useEffect(() => {
    if (!authed) return
    try {
      const snap = sessionStorage.getItem(SNAP_KEY)
      if (snap) {
        const d = JSON.parse(snap)
        setOrders(d.orders || []); setProducts(d.products || [])
        setPageViews(d.pageViews || []); setSettings(d.settings || {})
        setLoading(false)
      }
    } catch { /* snapshot corrupto: se ignora */ }
    loadAll()
  }, [authed, loadAll])
  // Precargar los datos de la otra tienda en segundo plano: el cambio de
  // tienda pinta al instante en vez de mostrar un spinner.
  useEffect(() => { if (authed) prefetchTiendas() }, [authed])

  function handleOrderUpdate(updated: Order) {
    setOrders(prev => prev.map(o => o.id === updated.id ? updated : o))
  }

  function navigate(id: SectionId) {
    setActiveSection(id)
    setStoreView("cliche") // las herramientas del sidebar son de la tienda Cliché
    setSidebarOpen(false)
  }

  const STORE_META: Record<StoreView, { label: string; sub: string; dot: string; icon: typeof Store }> = {
    cliche: { label: "Cliché", sub: "Panel administrativo", dot: "#A67163", icon: Store },
    bienestar: { label: "Bienestar", sub: "Gestión en vivo", dot: "#6E7A6D", icon: Store },
    comparar: { label: "Comparar tiendas", sub: "Métricas lado a lado", dot: "#8b8b8b", icon: Scale },
  }

  function pickStore(v: StoreView) {
    setStoreView(v)
    setStoreDdOpen(false)
    if (v !== "comparar") setSidebarOpen(false)
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
  // Solo bloquea la PRIMERA vez (sin snapshot): un refresco en segundo plano
  // jamás tapa el panel que ya está pintado.
  if (loading && orders.length === 0 && products.length === 0) {
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
    // skin-bienestar: al administrar Bienestar, TODO el panel (sidebar, fondos,
    // acentos) adopta su paleta verde — ver los overrides en globals.css.
    <div className={`min-h-screen bg-[#FAF8F5] flex ${storeView === "bienestar" ? "skin-bienestar" : ""}`}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-[#2D1A14]/8 z-40 flex flex-col transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Selector de tienda (esquina superior izquierda): se hunde y se
            despliega la tienda opuesta + el comparador. */}
        <div className="border-b border-[#2D1A14]/8">
          <div className="flex items-center">
            <button onClick={() => setStoreDdOpen(v => !v)} aria-expanded={storeDdOpen}
              className="flex-1 flex items-center gap-3 px-5 py-4 text-left hover:bg-[#FAF8F5] transition-colors">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: STORE_META[storeView].dot }}>
                {(() => { const I = STORE_META[storeView].icon; return <I className="w-4 h-4 text-white" /> })()}
              </span>
              <span className="min-w-0">
                <p className="font-semibold text-[#2D1A14] text-sm leading-none truncate">{STORE_META[storeView].label}</p>
                <p className="text-[10px] text-[#2D1A14]/40 mt-1 truncate">{STORE_META[storeView].sub}</p>
              </span>
              <ChevronDown className={`w-4 h-4 text-[#2D1A14]/40 ml-auto flex-shrink-0 transition-transform duration-300 ${storeDdOpen ? "rotate-180" : ""}`} />
            </button>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden w-7 h-7 mr-3 rounded-lg hover:bg-[#FAF8F5] flex items-center justify-center flex-shrink-0">
              <X className="w-4 h-4 text-[#2D1A14]/50" />
            </button>
          </div>
          <div className={`store-dd ${storeDdOpen ? "open" : ""}`}>
            <div>
              {(["cliche", "bienestar", "comparar"] as StoreView[]).filter(v => v !== storeView).map(v => (
                <button key={v} onClick={() => pickStore(v)}
                  className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-[#FAF8F5] transition-colors">
                  <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: STORE_META[v].dot }}>
                    {(() => { const I = STORE_META[v].icon; return <I className="w-3.5 h-3.5 text-white" /> })()}
                  </span>
                  <span className="min-w-0">
                    <p className="text-sm font-medium text-[#2D1A14] leading-none truncate">{STORE_META[v].label}</p>
                    <p className="text-[10px] text-[#2D1A14]/40 mt-0.5 truncate">{STORE_META[v].sub}</p>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Nav — en modo comparativa se ocultan las herramientas: esa vista
            solo muestra métricas lado a lado. */}
        <nav className={`flex-1 overflow-y-auto px-3 py-4 space-y-5 ${storeView === "comparar" ? "hidden" : ""}`}>
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
                        active && storeView === "cliche"
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
            {storeView === "bienestar" ? " · Bienestar" : storeView === "comparar" ? " · Comparativa" : ""}
          </p>
          <button onClick={handleLogout} className="w-9 h-9 rounded-xl border border-[#2D1A14]/15 flex items-center justify-center">
            <LogOut className="w-4 h-4 text-[#2D1A14]/50" />
          </button>
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div key={`${storeView}-${activeSection}`} className="admin-view">
          {loadError && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <span className="text-base leading-none">⚠️</span>
              <div>
                <p className="font-semibold">No se pudieron cargar los datos en vivo</p>
                <p className="text-amber-800/80">{loadError} El panel sigue siendo usable; los datos aparecerán cuando la conexión esté disponible.</p>
              </div>
            </div>
          )}
          {storeView === "cliche" && activeSection === "resumen" && (
            <OverviewSection orders={orders} pageViews={pageViews} products={products} />
          )}
          {storeView === "cliche" && activeSection === "ventas" && (
            <VentasSection orders={orders} products={products} />
          )}
          {storeView === "cliche" && activeSection === "trafico" && (
            <TraficoSection orders={orders} pageViews={pageViews} />
          )}
          {storeView === "cliche" && activeSection === "productos-stats" && (
            <ProductosStatsSection orders={orders} products={products} pageViews={pageViews} />
          )}
          {storeView === "cliche" && activeSection === "heatmaps" && (
            <HeatmapsSection pageViews={pageViews} />
          )}
          {storeView === "cliche" && activeSection === "pedidos" && (
            <PedidosSection orders={orders} products={products} onOrdersUpdate={handleOrderUpdate} />
          )}
          {storeView === "cliche" && activeSection === "clientes" && (
            <ClientesSection />
          )}
          {storeView === "cliche" && activeSection === "descuentos" && (
            <DescuentosSection />
          )}
          {storeView === "cliche" && activeSection === "blogs" && (
            <BlogsSection />
          )}
          {storeView === "cliche" && activeSection === "inventario" && (
            <InventarioSection products={products} onRefresh={loadAll} />
          )}
          {storeView === "cliche" && activeSection === "catalogo" && (
            <CatalogoEditorSection />
          )}
          {storeView === "cliche" && activeSection === "seo" && (
            <SeoSection products={products} />
          )}
          {storeView === "cliche" && activeSection === "asistente" && (
            <AsistenteSection />
          )}
          {storeView === "bienestar" && (
            <BienestarSection />
          )}
          {storeView === "comparar" && (
            <CompararTiendasSection />
          )}
          </div>
        </main>
      </div>

      {/* Ayuda con IA: burbuja flotante, disponible en todas las secciones */}
      <ChatAyuda />
    </div>
  )
}
