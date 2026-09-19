"use client"

import { useState, useEffect, useCallback, useRef, memo, type ComponentType } from "react"
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
import { StoreCurtain, startStoreCurtain, storeCurtainReady } from "./components/store-curtain"

import dynamic from "next/dynamic"
import Image from "next/image"
// Solo el TIPO: importar el módulo tiendas aquí lo metía en el bundle del
// cascarón del panel (ver nota "desactivado parcialmente" más abajo).
import type { PeerTab } from "./sections/tiendas"

// Loader ÚNICO de marca (pedido de Andrés: nunca dos spinners a la vez ni
// descentrados): logo Cliché + puntos respirando, centrado. Se usa en el
// gate, en la primera carga de datos y mientras baja el chunk de una sección.
const BrandLoader = ({ full = false }: { full?: boolean }) => (
  <div className={`grid place-items-center ${full ? "min-h-screen bg-[#FAF8F5]" : "min-h-[65vh]"}`}>
    <div className="text-center">
      <Image src="/images/logo-cliche.png" alt="Cargando" width={152} height={128} sizes="120px" priority
        className="mx-auto h-14 w-auto object-contain opacity-90 md:h-16" />
      <div className="mt-5 flex items-center justify-center gap-1.5">
        {[0, 1, 2].map(i => (
          <span key={i} className="h-1.5 w-1.5 rounded-full bg-[#A67163]" style={{ animation: `admin-dot 1.1s ease-in-out ${i * 0.18}s infinite` }} />
        ))}
      </div>
    </div>
  </div>
)

// Sections CODE-SPLIT: antes TODO el panel (editor Tiptap del blog, gráficas
// Recharts, asistente, etc.) viajaba en UN solo bundle gigante — hasta que no
// bajaba y se ejecutaba, NINGÚN botón respondía (el selector de tiendas podía
// tardar minutos en conexiones lentas). Ahora cada sección se descarga solo
// al abrirla y el cascarón del panel hidrata en milisegundos.
const SectionLoading = () => <BrandLoader />
const lazy = <T,>(load: () => Promise<T>, pick: (m: T) => ComponentType<any>, opts?: { quiet?: boolean }) =>
  dynamic(() => load().then(m => ({ default: pick(m) })), { ssr: false, ...(opts?.quiet ? {} : { loading: SectionLoading }) })

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
// quiet: la burbuja flotante de ayuda no debe mostrar un spinner suelto en la
// esquina mientras baja su chunk (se veía un segundo loader descentrado).
const ChatAyuda = lazy(() => import("./components/chat-ayuda"), m => m.ChatAyuda, { quiet: true })

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

// Sidebar cuando se administra BIENESTAR: sus propias secciones. Navegar aquí
// NUNCA te saca de Bienestar (petición explícita de Andrés).
const BIENESTAR_NAV = [
  { section: "GENERAL", items: [
    { id: "resumen", label: "Resumen", icon: LayoutDashboard },
  ]},
  { section: "OPERACIONES", items: [
    { id: "pedidos", label: "Pedidos", icon: ShoppingBag },
    { id: "productos", label: "Productos", icon: Package },
  ]},
] as const

const STORE_META: Record<StoreView, { label: string; sub: string; dot: string; icon: typeof Store }> = {
  cliche: { label: "Cliché", sub: "Panel administrativo", dot: "#A67163", icon: Store },
  bienestar: { label: "Bienestar", sub: "Gestión en vivo", dot: "#6E7A6D", icon: Store },
  comparar: { label: "Comparar tiendas", sub: "Métricas lado a lado", dot: "#8b8b8b", icon: Scale },
}

/** Selector de tienda (esquina superior izquierda del sidebar).
 *  Componente propio y memoizado: antes su estado abierto/cerrado vivía en el
 *  AdminPage, así que CADA clic al botón re-renderizaba el árbol completo del
 *  panel (sidebar + sección activa) — por eso el menú se sentía trabado pese
 *  a que la animación en sí es solo transform/opacity. Ahora abrirlo solo
 *  re-renderiza este componente diminuto. */
const StoreSelector = memo(function StoreSelector({ storeView, onPick, onCloseSidebar }: {
  storeView: StoreView
  onPick: (v: StoreView) => void
  onCloseSidebar: () => void
}) {
  const [open, setOpen] = useState(false)
  // Al ABRIR el menú (intención clara de cambiar de tienda) se precalientan el
  // chunk de tiendas y los resúmenes peer: cuando el clic llega, ya vienen en
  // camino y la cortina se levanta antes. La precarga al DESBLOQUEAR el panel
  // sigue desactivada (pedido de Andrés: enlentecía el arranque).
  const warmed = useRef(false)
  useEffect(() => {
    if (!open || warmed.current) return
    warmed.current = true
    import("./sections/tiendas").then(m => m.prefetchTiendas()).catch(() => {})
  }, [open])

  return (
    <div className="relative border-b border-[#2D1A14]/8">
      <div className="flex items-center">
        <button onClick={() => setOpen(v => !v)} aria-expanded={open}
          className="flex-1 flex items-center gap-3 px-5 py-4 text-left hover:bg-[#FAF8F5] transition-colors">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: STORE_META[storeView].dot }}>
            {(() => { const I = STORE_META[storeView].icon; return <I className="w-4 h-4 text-white" /> })()}
          </span>
          <span className="min-w-0">
            <p className="font-semibold text-[#2D1A14] text-sm leading-none truncate">{STORE_META[storeView].label}</p>
            <p className="text-[10px] text-[#2D1A14]/40 mt-1 truncate">{STORE_META[storeView].sub}</p>
          </span>
          <ChevronDown className={`w-4 h-4 text-[#2D1A14]/40 ml-auto flex-shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
        </button>
        <button onClick={onCloseSidebar} className="lg:hidden w-7 h-7 mr-3 rounded-lg hover:bg-[#FAF8F5] flex items-center justify-center flex-shrink-0">
          <X className="w-4 h-4 text-[#2D1A14]/50" />
        </button>
      </div>
      <div className={`store-dd ${open ? "open" : ""}`}>
        <div>
          {(["cliche", "bienestar", "comparar"] as StoreView[]).filter(v => v !== storeView).map(v => (
            <button key={v} onClick={() => { setOpen(false); onPick(v) }}
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
  )
})

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
  // Secciones ya visitadas: quedan montadas (ocultas con CSS) para que volver
  // a ellas sea instantáneo. Ver el bloque de render en <main>.
  const visitedSections = useRef<Set<SectionId>>(new Set(["resumen"]))
  visitedSections.current.add(activeSection)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [newVersion, setNewVersion] = useState(false)
  const [storeView, setStoreView] = useState<StoreView>("cliche")
  const [peerTab, setPeerTab] = useState<PeerTab>("resumen")

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
    // Si adminFetch nos trajo aquí por sesión vencida, decirlo en el login.
    try {
      if (sessionStorage.getItem("cliche_admin_expired") === "1") {
        sessionStorage.removeItem("cliche_admin_expired")
        setAuthError("Tu sesión expiró. Inicia sesión de nuevo para continuar.")
      }
    } catch {}
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
    try {
      sessionStorage.removeItem("cliche_admin_unlocked")
      sessionStorage.removeItem("cliche_admin_snapshot_v1")
      localStorage.removeItem("cliche_admin_snapshot_v1")
    } catch {}
    adminFetch("/api/admin/logout", { method: "POST" }).finally(() => window.location.replace("/"))
  }

  // ── Snapshot instantáneo ──────────────────────────────────────────────────
  // La última foto de los datos queda en localStorage (antes sessionStorage,
  // que muere con la pestaña): el panel pinta AL INSTANTE también en pestañas
  // y sesiones de navegador nuevas, y se refresca en segundo plano — los
  // datos siguen siendo en tiempo real, solo que la espera no se ve. El
  // loader bloqueante queda únicamente para el primerísimo uso del equipo.
  // Solo se pinta tras verificar el acceso (gate desbloqueado) y el logout lo
  // borra. Si otra persona usara el equipo sin sesión, no pasa del login.
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
        localStorage.setItem(SNAP_KEY, JSON.stringify({ orders: ords || [], products: prods || [], pageViews: views || [], settings: map }))
        sessionStorage.removeItem(SNAP_KEY) // migración desde el snapshot viejo por-pestaña
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
      const snap = localStorage.getItem(SNAP_KEY) || sessionStorage.getItem(SNAP_KEY)
      if (snap) {
        const d = JSON.parse(snap)
        setOrders(d.orders || []); setProducts(d.products || [])
        setPageViews(d.pageViews || []); setSettings(d.settings || {})
        setLoading(false)
      }
    } catch { /* snapshot corrupto: se ignora */ }
    loadAll()
  }, [authed, loadAll])
  // Multi-tienda DESACTIVADO PARCIALMENTE (petición de Andrés: dejaba el
  // panel muy lento): ya NO se precargan los resúmenes de la otra tienda al
  // desbloquear, ni viaja el chunk de tiendas en el arranque. El selector
  // sigue funcionando — al entrar a Bienestar/Comparar los datos se cargan
  // en ese momento (con spinner). Para reactivar la precarga: volver a
  // importar prefetchTiendas y llamarla aquí con el panel desbloqueado.

  // Sesión viva mientras el panel esté abierto: whoami renueva la cookie
  // (deslizante, 8h) en cada visita; este ping cada 20 min evita que una
  // pestaña abierta de un día para otro se quede con el token vencido y
  // todo guardado responda "No autorizado". Si aun así la sesión murió
  // (p. ej. el equipo estuvo suspendido), se vuelve al login con aviso.
  useEffect(() => {
    if (!authed) return
    const ping = async () => {
      try {
        const d = await adminFetch("/api/admin/whoami").then(r => r.json())
        if (d && d.unlocked === false) {
          try {
            sessionStorage.setItem("cliche_admin_unlocked", "0")
            sessionStorage.setItem("cliche_admin_expired", "1")
          } catch {}
          window.location.reload()
        }
      } catch { /* sin red: se reintenta en el próximo tick */ }
    }
    const t = setInterval(ping, 20 * 60_000)
    return () => clearInterval(t)
  }, [authed])

  // Detector de versión: una pestaña abierta NUNCA se actualiza sola cuando
  // se despliega — el JS viejo (con bugs ya corregidos) sigue corriendo por
  // horas. Cada 5 min se compara el SHA desplegado y se ofrece recargar.
  useEffect(() => {
    if (!authed) return
    let initial: string | null = null
    const check = async () => {
      try {
        const { sha } = await fetch("/api/health", { cache: "no-store" }).then(r => r.json())
        if (!sha) return
        if (!initial) { initial = sha; return }
        if (sha !== initial) setNewVersion(true)
      } catch { /* sin red: se reintenta en el próximo tick */ }
    }
    void check()
    const t = setInterval(check, 5 * 60_000)
    return () => clearInterval(t)
  }, [authed])

  // Con el panel ya interactivo, se descargan los chunks de las secciones en
  // tiempo muerto del navegador: al hacer clic ya están en caché (sin spinner)
  // y el arranque sigue siendo liviano.
  useEffect(() => {
    if (!authed) return
    const warm = () => {
      void import("./sections/overview"); void import("./sections/ventas")
      void import("./sections/trafico"); void import("./sections/productos-stats")
      void import("./sections/pedidos"); void import("./sections/inventario")
      void import("./sections/heatmaps"); void import("./sections/descuentos")
      void import("./sections/asistente"); void import("./sections/clientes")
      void import("./sections/seo"); void import("./sections/blogs")
      // sections/tiendas NO se precalienta (multi-tienda parcialmente
      // desactivado): su chunk baja solo si se entra a Bienestar/Comparar.
      void import("./sections/catalogo-editor")
      void import("./components/chat-ayuda")
    }
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }
    if (w.requestIdleCallback) w.requestIdleCallback(warm, { timeout: 4000 })
    else setTimeout(warm, 2500)
  }, [authed])

  // Cada vista arranca ARRIBA: al cambiar de sección o de tienda se resetea
  // el scroll de la ventana. Sin esto, el contenido nuevo se montaba con el
  // scroll viejo (podías "aparecer" a mitad de página) y la barra de scroll
  // quedaba desincronizada mostrando una posición que ya no era real.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [storeView, activeSection, peerTab])

  function handleOrderUpdate(updated: Order) {
    setOrders(prev => prev.map(o => o.id === updated.id ? updated : o))
  }

  // Aplica el cambio de tienda de inmediato (sin cortina): reduced-motion y
  // el momento en que la cortina ya cubrió la pantalla.
  const applyStore = useCallback((v: StoreView) => {
    setStoreView(v)
    if (v === "bienestar") setPeerTab("resumen")
    if (v !== "comparar") setSidebarOpen(false)
  }, [])

  // El clic solo dispara el EVENTO de la cortina: ningún estado del panel
  // cambia, así que el árbol pesado no se re-renderiza y la animación arranca
  // al instante. El swap real llega en onCurtainCovered, ya con todo tapado.
  const beginStoreSwitch = useCallback((v: StoreView) => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      applyStore(v)
      return
    }
    startStoreCurtain(v)
  }, [applyStore])

  const pickStore = useCallback((v: StoreView) => {
    if (v === storeView) return
    beginStoreSwitch(v)
  }, [storeView, beginStoreSwitch])

  const onCurtainCovered = useCallback((v: StoreView) => {
    applyStore(v)
    // La vista de Cliché ya tiene sus datos en memoria: lista de inmediato.
    // Bienestar/Comparar avisan ellas mismas con onViewReady al tener datos.
    if (v === "cliche") storeCurtainReady()
  }, [applyStore])
  // Lo llaman BienestarSection/CompararTiendasSection cuando ya hay datos (o
  // el error con su Reintentar) en pantalla: la cortina puede levantarse.
  const onViewReady = useCallback(() => storeCurtainReady(), [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  function navigate(id: SectionId) {
    setActiveSection(id)
    setSidebarOpen(false)
    // Las herramientas del sidebar son de la tienda Cliché: si se estaba
    // administrando otra, el regreso también pasa por la cortina.
    if (storeView !== "cliche") beginStoreSwitch("cliche")
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
    return <BrandLoader full />
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
    return <BrandLoader full />
  }

  // ── MAIN LAYOUT ────────────────────────────────────────────────────────────
  return (
    // skin-bienestar: al administrar Bienestar, TODO el panel (sidebar, fondos,
    // acentos) adopta su paleta verde — ver los overrides en globals.css.
    // overflow-x-clip + min-w-0 (abajo): el panel solo se mueve en VERTICAL.
    // Sin el min-w-0, la columna de contenido (flex item) no podía encogerse
    // por debajo del ancho intrínseco de las grillas/tablas y empujaba un
    // scroll horizontal en toda la página (pedido de Andrés: solo vertical).
    <div className={`min-h-screen bg-[#FAF8F5] flex overflow-x-clip ${storeView === "bienestar" ? "skin-bienestar" : ""}`}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-[#2D1A14]/8 z-40 flex flex-col transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Selector de tienda (esquina superior izquierda): componente
            memoizado — abrirlo no re-renderiza el resto del panel. */}
        <StoreSelector storeView={storeView} onPick={pickStore} onCloseSidebar={closeSidebar} />

        {/* Nav — en modo comparativa se ocultan las herramientas: esa vista
            solo muestra métricas lado a lado. */}
        <nav className={`flex-1 overflow-y-auto px-3 py-4 space-y-5 ${storeView === "comparar" ? "hidden" : ""}`}>
          {(storeView === "bienestar" ? BIENESTAR_NAV : SIDEBAR).map(group => (
            <div key={group.section}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#2D1A14]/30 px-2 mb-1.5">{group.section}</p>
              <div className="space-y-0.5">
                {group.items.map(({ id, label, icon: Icon }) => {
                  const badge = storeView === "cliche" ? navBadges[id] : undefined
                  const active = storeView === "bienestar" ? peerTab === id : activeSection === id
                  return (
                    <button
                      key={id}
                      onClick={() => { if (storeView === "bienestar") { setPeerTab(id as PeerTab); setSidebarOpen(false) } else navigate(id as SectionId) }}
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
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-20 bg-white border-b border-[#2D1A14]/8 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="w-9 h-9 rounded-xl border border-[#2D1A14]/15 flex items-center justify-center">
            <Menu className="w-4 h-4 text-[#2D1A14]" />
          </button>
          <p className="font-semibold text-[#2D1A14] text-sm">
            {storeView === "bienestar"
              ? `Bienestar · ${({ resumen: "Resumen", pedidos: "Pedidos", productos: "Productos" } as Record<string, string>)[peerTab]}`
              : storeView === "comparar"
                ? "Comparar tiendas"
                : (SIDEBAR.flatMap(g => [...g.items]) as Array<{ id: string; label: string; icon: unknown }>).find(i => i.id === activeSection)?.label || "Panel Admin"}
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
          {/* Secciones de Cliché PERSISTENTES: cada sección visitada queda
              montada y solo se oculta con display:none — volver a ella es
              INSTANTÁNEO (antes el remount con key re-creaba las gráficas y
              el cambio Blogs→Resumen tardaba segundos). Al re-mostrarse, la
              animación .admin-view se reproduce sola (display none→block
              reinicia animaciones CSS). Los datos siguen en tiempo real: las
              secciones ocultas reciben los mismos props actualizados. */}
          {(Object.entries({
            resumen: <OverviewSection orders={orders} pageViews={pageViews} products={products} />,
            ventas: <VentasSection orders={orders} products={products} />,
            trafico: <TraficoSection orders={orders} pageViews={pageViews} />,
            "productos-stats": <ProductosStatsSection orders={orders} products={products} pageViews={pageViews} />,
            heatmaps: <HeatmapsSection pageViews={pageViews} />,
            pedidos: <PedidosSection orders={orders} products={products} onOrdersUpdate={handleOrderUpdate} />,
            clientes: <ClientesSection />,
            descuentos: <DescuentosSection />,
            blogs: <BlogsSection />,
            inventario: <InventarioSection products={products} onRefresh={loadAll} />,
            catalogo: <CatalogoEditorSection />,
            seo: <SeoSection products={products} />,
            asistente: <AsistenteSection />,
          }) as [SectionId, React.ReactNode][])
            .filter(([id]) => visitedSections.current.has(id))
            .map(([id, el]) => {
              const active = storeView === "cliche" && activeSection === id
              return (
                <div key={id} className="admin-view" style={active ? undefined : { display: "none" }}>
                  {el}
                </div>
              )
            })}
          {storeView === "bienestar" && (
            <div key={`bienestar-${peerTab}`} className="admin-view">
              <BienestarSection tab={peerTab} onReady={onViewReady} />
            </div>
          )}
          {storeView === "comparar" && (
            <div className="admin-view">
              <CompararTiendasSection onReady={onViewReady} />
            </div>
          )}
        </main>
      </div>

      {newVersion && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-[#2D1A14] text-white text-sm rounded-2xl px-4 py-3 shadow-2xl">
          Hay una versión nueva del panel.
          <button onClick={() => window.location.reload()} className="bg-white text-[#2D1A14] text-xs font-bold rounded-xl px-3 py-1.5">Actualizar</button>
        </div>
      )}

      {/* Cortina de cambio de tienda (branding del destino, misma cinemática
          que la cortina de la tienda pública) */}
      <StoreCurtain onCovered={onCurtainCovered} />

      {/* Ayuda con IA: burbuja flotante, disponible en todas las secciones */}
      <ChatAyuda />
    </div>
  )
}
