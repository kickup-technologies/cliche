"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useSearchParams, useRouter } from "next/navigation"
import {
  Mail, Lock, LogOut, Package, MapPin, User as UserIcon, Settings, CheckCircle, AlertCircle,
  Loader2, Plus, Trash2, Heart, Star, Truck, RotateCcw, ShieldCheck,
  Crown, ChevronRight, ArrowRight, PackageOpen, Sparkles, Phone, Calendar, Monitor, Pencil,
  Smartphone, Tablet, type LucideIcon,
} from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useAuth } from "@/context/auth-context"
import { useFavorites } from "@/context/favorites-context"
import { getSupabaseBrowser } from "@/lib/supabase/client"
import { NOTES_MAP } from "@/lib/aroma-notes"
import type { Product } from "@/lib/supabase"

const CREMA = "#FAF8F5"
const CAFE = "#2D1A14"
const TERRA = "#A67163"
const GOLD = "#E0B341"
const fmt = (n: number) => `$${(n || 0).toLocaleString("es-CO")}`

const PROFILE_BG = "/images/cuenta/membership.jpg" // Romeo y Julieta
const HELP_IMG = "/images/cuenta/help.jpg" // foto editorial bienestar (decorativa)
const HERO_IMG = "/images/cuenta/pedidos-banner.jpg" // banner panorámico (3 frascos)

type Order = { id: string; created_at: string; status: string; total: number }
const TIERS = [{ name: "Plata", min: 0 }, { name: "Oro", min: 300000 }, { name: "Platino", min: 700000 }] as const
function tierOf(spent: number) {
  let idx = 0
  for (let i = TIERS.length - 1; i >= 0; i--) if (spent >= TIERS[i].min) { idx = i; break }
  return { tier: TIERS[idx], next: TIERS[idx + 1] as (typeof TIERS)[number] | undefined }
}

export default function CuentaPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: CREMA }}>
      <Header />
      <Suspense fallback={<div className="flex justify-center py-40"><Loader2 className="h-6 w-6 animate-spin" style={{ color: TERRA }} /></div>}>
        <CuentaContent />
      </Suspense>
      <Footer />
    </main>
  )
}

function CuentaContent() {
  const { user, loading, signOut } = useAuth()
  if (loading) return <div className="flex justify-center py-40"><Loader2 className="h-6 w-6 animate-spin" style={{ color: TERRA }} /></div>
  if (!user) return <section className="mx-auto max-w-md px-5 pb-24 pt-28 sm:pt-36"><AuthForm /></section>
  return <Dashboard email={user.email || ""} createdAt={user.created_at} signOut={signOut} />
}

/* ─────────────────────────── DASHBOARD ─────────────────────────── */
const NAV = [
  { id: "pedidos", label: "Mis pedidos", icon: Package },
  { id: "datos", label: "Mis datos", icon: UserIcon },
  { id: "direcciones", label: "Direcciones", icon: MapPin },
  { id: "config", label: "Configuración", icon: Settings },
] as const
type SecId = (typeof NAV)[number]["id"]
// Menú visible: Direcciones se gestiona desde "Mis datos", no como pestaña propia.
const MENU = NAV.filter((n) => n.id !== "direcciones")

function Dashboard({ email, createdAt, signOut }: { email: string; createdAt?: string; signOut: () => Promise<void> }) {
  const params = useSearchParams()
  const seccion = (params.get("seccion") || "pedidos") as SecId
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    getSupabaseBrowser().from("orders").select("id, created_at, status, total").order("created_at", { ascending: false })
      .then(({ data }: { data: Order[] | null }) => setOrders(data ?? []))
    fetch("/api/products").then(r => r.json()).then((all: Product[]) => {
      const list = (Array.isArray(all) ? all : []).filter(p => p.is_active !== false && !p.slug?.startsWith("kit-"))
      setProducts([...list].sort(() => Math.random() - 0.5))
    }).catch(() => {})
  }, [])

  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 pt-24 sm:px-6 sm:pt-28">
      <div className="lg:grid lg:grid-cols-[330px_1fr] lg:gap-x-12">
        {/* ── SIDEBAR (solo escritorio): identidad + navegación vertical ── */}
        <div className="hidden lg:block">
          <ProfileCard email={email} createdAt={createdAt} orders={orders} />
          <AccountNav seccion={seccion} signOut={signOut} />
          <ClubBenefits orders={orders} />
          <HelpCard />
        </div>

        {/* ── MÓVIL: membresía + tabs horizontales fijadas al tope ── */}
        <div className="lg:hidden">
          <ProfileCard email={email} createdAt={createdAt} orders={orders} />
          <AccountTabs seccion={seccion} />
        </div>

        {/* ── CONTENIDO ── */}
        <div className="mt-6 min-w-0 lg:mt-0">
          {seccion === "pedidos" && <SeccionPedidos orders={orders} products={products} />}
          {seccion === "datos" && <SeccionDatos email={email} />}
          {seccion === "direcciones" && <SeccionDirecciones />}
          {seccion === "config" && <SeccionConfig />}
        </div>

        {/* ── MÓVIL: beneficios + ayuda + cerrar sesión al final ── */}
        <div className="mt-10 lg:hidden">
          <ClubBenefits orders={orders} />
          <HelpCard />
          <button onClick={() => signOut()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-red-600/90 transition-colors hover:bg-red-50/60">
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.5} /> Cerrar sesión
          </button>
        </div>
      </div>
    </section>
  )
}

/* Navegación MÓVIL — pill unificada fijada al tope, estilo Instagram: el dedo
   se desliza por la barra y el resaltado lo sigue en tiempo real (mismo efecto
   que el hover en escritorio); al soltar, selecciona. La pill crece al tocar.
   Iconos (cada sección ya muestra su título en el contenido). */
const TAB_EASE = "transform 0.3s cubic-bezier(0.22,1,0.36,1), opacity 0.2s ease"
function AccountTabs({ seccion }: { seccion: SecId }) {
  const router = useRouter()
  const barRef = useRef<HTMLDivElement>(null)
  const indRef = useRef<HTMLSpanElement>(null)
  const [dragging, setDragging] = useState(false)
  // Geometría cacheada + índice objetivo en refs: cero re-render durante el arrastre.
  const geo = useRef({ pad: 6, itemW: 0, barLeft: 0 })
  const raf = useRef<number | null>(null)
  const lastX = useRef(0)
  const idxRef = useRef(0)

  const measure = () => {
    const bar = barRef.current; if (!bar) return
    geo.current.itemW = (bar.clientWidth - geo.current.pad * 2) / MENU.length
  }
  // Posiciona el resaltado con transform (sin reflow) — GPU, fluido.
  const applyLeft = (left: number, animate: boolean) => {
    const span = indRef.current; if (!span) return
    span.style.transition = animate ? TAB_EASE : "none"
    span.style.width = `${geo.current.itemW}px`
    span.style.transform = `translate3d(${left}px,0,0)`
    span.style.opacity = "1"
  }
  const restToActive = (animate = true) => {
    measure()
    const idx = Math.max(0, MENU.findIndex((n) => n.id === seccion))
    idxRef.current = idx
    applyLeft(geo.current.pad + idx * geo.current.itemW, animate)
  }
  useEffect(() => { restToActive(true) }, [seccion])
  useEffect(() => {
    const onResize = () => restToActive(false)
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  // Un solo cálculo/escritura por frame (coalesce de los muchos touchmove).
  const tick = () => {
    raf.current = null
    const { pad, itemW, barLeft } = geo.current
    const x = lastX.current - barLeft
    const left = Math.max(pad, Math.min(x - itemW / 2, pad + itemW * (MENU.length - 1)))
    applyLeft(left, false)
    idxRef.current = Math.max(0, Math.min(MENU.length - 1, Math.floor((x - pad) / itemW)))
  }
  const onStart = (e: React.TouchEvent) => {
    const bar = barRef.current; if (!bar) return
    measure()
    geo.current.barLeft = bar.getBoundingClientRect().left // se cachea UNA vez
    setDragging(true)
    lastX.current = e.touches[0].clientX
    tick()
  }
  const onMove = (e: React.TouchEvent) => {
    e.preventDefault()
    lastX.current = e.touches[0].clientX
    if (raf.current == null) raf.current = requestAnimationFrame(tick)
  }
  const onEnd = () => {
    if (raf.current != null) { cancelAnimationFrame(raf.current); raf.current = null }
    setDragging(false)
    const target = MENU[idxRef.current]
    if (target && target.id !== seccion) router.push(`/cuenta?seccion=${target.id}`)
    else restToActive(true)
  }

  return (
    <div className="sticky top-16 z-30 mt-5">
      <div
        ref={barRef}
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
        className="relative mx-auto flex w-full touch-none select-none items-center justify-between rounded-full bg-white p-1.5 shadow-[0_16px_44px_-26px_rgba(45,26,20,0.65)] transition-transform duration-200 ease-out"
        style={{ transform: dragging ? "scale(1.045)" : "scale(1)" }}
      >
        {/* Resaltado: transform translateX siguiendo al dedo; descansa en la activa. */}
        <span ref={indRef} aria-hidden className="pointer-events-none absolute bottom-1.5 left-0 top-0 z-0 rounded-full"
          style={{ height: "auto", opacity: 0, willChange: "transform", backgroundColor: `${TERRA}24`, top: 6, bottom: 6 }} />
        {MENU.map(({ id, label, icon: Icon }) => {
          const active = seccion === id
          return (
            <Link key={id} href={`/cuenta?seccion=${id}`} data-tab={id} data-active={active} aria-label={label}
              className="relative z-10 flex h-11 flex-1 items-center justify-center rounded-full"
              style={{ color: active ? TERRA : `${CAFE}80` }}>
              <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2 : 1.6} />
            </Link>
          )
        })}
      </div>
    </div>
  )
}

/* Navegación con "cursor" deslizante vertical: el indicador sigue al puntero en
   hover y descansa sobre la sección activa al soltar (adaptación vertical del
   patrón de cursor deslizante, con transición CSS en vez de framer-motion). */
function AccountNav({ seccion, signOut }: { seccion: SecId; signOut: () => Promise<void> }) {
  const listRef = useRef<HTMLDivElement>(null)
  const [ind, setInd] = useState({ top: 0, height: 0, opacity: 0 })

  const moveTo = (el: HTMLElement | null) => {
    if (el) setInd({ top: el.offsetTop, height: el.offsetHeight, opacity: 1 })
  }
  const resetToActive = () => {
    const el = listRef.current?.querySelector<HTMLElement>('[data-active="true"]')
    if (el) setInd({ top: el.offsetTop, height: el.offsetHeight, opacity: 1 })
    else setInd((p) => ({ ...p, opacity: 0 }))
  }
  // Reposicionar el indicador sobre la sección activa al montar / cambiar de sección.
  useEffect(() => { resetToActive() }, [seccion])

  return (
    <>
      <p className="mb-2 mt-8 px-1 text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: `${CAFE}55` }}>Tu cuenta</p>
      <div ref={listRef} className="relative flex flex-col" onMouseLeave={resetToActive}>
        {/* Indicador deslizante (detrás del texto) */}
        <span aria-hidden className="pointer-events-none absolute left-0 right-0 z-0 rounded-2xl"
          style={{ top: ind.top, height: ind.height, opacity: ind.opacity, backgroundColor: "#fff", boxShadow: "0 12px 30px -20px rgba(45,26,20,0.45)", transition: "top 0.32s cubic-bezier(0.22,1,0.36,1), height 0.32s cubic-bezier(0.22,1,0.36,1), opacity 0.2s ease" }} />
        {MENU.map(({ id, label, icon: Icon }) => {
          const active = seccion === id
          return (
            <Link key={id} href={`/cuenta?seccion=${id}`} data-active={active}
              onMouseEnter={(e) => moveTo(e.currentTarget)}
              className="group relative z-10 flex h-[52px] items-center gap-3 rounded-2xl px-3 text-sm font-medium transition-colors"
              style={{ color: active ? TERRA : CAFE }}>
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} style={{ color: active ? TERRA : `${CAFE}88` }} />
              <span className="flex-1">{label}</span>
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" style={{ color: `${CAFE}30` }} />
            </Link>
          )
        })}
        <button onClick={() => signOut()} data-active={false}
          onMouseEnter={(e) => moveTo(e.currentTarget)}
          className="group relative z-10 flex h-[52px] items-center gap-3 rounded-2xl px-3 text-sm font-medium text-red-600/90 transition-colors">
          <LogOut className="h-[18px] w-[18px]" strokeWidth={1.5} /> <span className="flex-1 text-left">Cerrar sesión</span>
        </button>
      </div>
    </>
  )
}

/* Tarjeta de membresía — foto Romeo y Julieta + overlay */
function ProfileCard({ email, createdAt, orders }: { email: string; createdAt?: string; orders: Order[] | null }) {
  const { user } = useAuth()
  const md = (user?.user_metadata ?? {}) as Record<string, unknown>
  // Nombre real del cliente (lo que guardó en "Mis datos"); si no, el correo.
  const name = ((md.first_name as string) || (md.full_name as string) || "").trim() || email.split("@")[0]
  const spent = (orders || []).filter(o => ["confirmed", "shipped", "delivered", "paid"].includes(o.status)).reduce((s, o) => s + (o.total || 0), 0)
  const { tier, next } = tierOf(spent)
  const progress = next ? Math.min(100, Math.round((spent - tier.min) / (next.min - tier.min) * 100)) : 100
  const since = createdAt ? new Date(createdAt).toLocaleDateString("es-CO", { month: "long", year: "numeric" }) : ""

  return (
    <div className="relative min-h-[230px] overflow-hidden rounded-[28px] p-6 text-white shadow-[0_24px_60px_-26px_rgba(45,26,20,0.6)]" style={{ backgroundColor: CAFE }}>
      <Image src={PROFILE_BG} alt="" fill priority className="object-cover" sizes="360px" />
      <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(165deg, rgba(30,18,13,0.72) 0%, rgba(30,18,13,0.45) 45%, rgba(30,18,13,0.82) 100%)" }} />
      <div className="relative flex h-full flex-col">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold" style={{ backgroundColor: CREMA, color: CAFE }}>{name.charAt(0).toUpperCase()}</div>
          <div className="min-w-0">
            <p className="truncate font-serif text-xl leading-tight">{name}</p>
            {since && <p className="text-[11px] capitalize text-white/65">Miembro desde {since}</p>}
          </div>
        </div>
        <div className="mt-auto pt-6">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[13px] font-semibold"><Crown className="h-4 w-4" style={{ color: GOLD }} /> Cliché Club</span>
            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: GOLD, color: CAFE }}>{tier.name}</span>
          </div>
          {next ? (
            <>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>
                <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: GOLD }} />
              </div>
              <p className="mt-1.5 text-[11px] text-white/75">Faltan <b className="text-white">{fmt(next.min - spent)}</b> para nivel {next.name}</p>
            </>
          ) : <p className="mt-2 text-[11px] text-white/75">¡Nivel máximo alcanzado! ✨</p>}
        </div>
      </div>
    </div>
  )
}

/* Tarjeta Beneficios Club — identidad, no dashboard (sin stats ni productos) */
function ClubBenefits({ orders }: { orders: Order[] | null }) {
  const spent = (orders || []).filter(o => ["confirmed", "shipped", "delivered", "paid"].includes(o.status)).reduce((s, o) => s + (o.total || 0), 0)
  const { tier } = tierOf(spent)
  const benefits = [
    { icon: Truck, text: "Envío gratis en todos tus pedidos" },
    { icon: Star, text: "Acceso anticipado a ofertas y lanzamientos" },
    { icon: Crown, text: `Beneficios nivel ${tier.name}` },
  ]
  return (
    <div className="mt-6 rounded-[24px] p-5" style={{ backgroundColor: "#fff", boxShadow: "0 14px 40px -30px rgba(45,26,20,0.55)" }}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: `${CAFE}55` }}>Beneficios Club</p>
      <ul className="mt-3 space-y-3">
        {benefits.map((b) => (
          <li key={b.text} className="flex items-start gap-3">
            <b.icon className="mt-0.5 h-[18px] w-[18px] flex-shrink-0" strokeWidth={1.5} style={{ color: TERRA }} />
            <span className="text-[13px] leading-snug" style={{ color: `${CAFE}cc` }}>{b.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function HelpCard() {
  return (
    <div className="relative mt-6 min-h-[150px] overflow-hidden rounded-[24px] p-5" style={{ backgroundColor: `${TERRA}12` }}>
      {/* Foto editorial decorativa en la esquina inferior derecha (no es fondo) */}
      <div aria-hidden className="pointer-events-none absolute bottom-0 right-0 top-0 w-[48%]">
        <Image src={HELP_IMG} alt="" fill sizes="170px" className="object-cover" style={{ WebkitMaskImage: "linear-gradient(90deg, transparent 0%, #000 58%)", maskImage: "linear-gradient(90deg, transparent 0%, #000 58%)" }} />
      </div>
      <div className="relative w-[58%]">
        <p className="font-serif text-lg" style={{ color: CAFE }}>¿Necesitas ayuda?</p>
        <p className="mt-1 text-xs" style={{ color: `${CAFE}99` }}>Habla con un asesor</p>
        <Link href="/contacto" className="mt-3 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: TERRA }}>
          Contáctanos <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  )
}

/* ─────────────────────────── MIS PEDIDOS (composición, menos cajas) ─────────────────────────── */
function SeccionPedidos({ orders, products }: { orders: Order[] | null; products: Product[] }) {
  const realizados = orders?.length ?? 0
  const enCamino = orders?.filter(o => ["shipped", "preparing", "confirmed", "paid"].includes(o.status)).length ?? 0
  const entregados = orders?.filter(o => o.status === "delivered").length ?? 0
  const devoluciones = orders?.filter(o => o.status === "cancelled").length ?? 0
  const kpis = [
    { n: realizados, label: "Pedidos realizados", icon: Package, cta: "Ver historial" },
    { n: enCamino, label: "Envíos en camino", icon: Truck, cta: "Rastrear envíos" },
    { n: entregados, label: "Pedidos entregados", icon: CheckCircle, cta: "Ver completados" },
    { n: devoluciones, label: "Devoluciones", icon: RotateCcw, cta: "Ver devoluciones" },
  ]
  return (
    <div className="space-y-8">
      {/* Hero único: imagen full-bleed de fondo + overlay + texto encima */}
      <div className="relative h-[220px] w-full overflow-hidden rounded-[24px] sm:h-[240px]">
        <Image src={HERO_IMG} alt="" fill priority className="object-cover object-center" sizes="(max-width: 1024px) 100vw, 760px" />
        <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.38) 38%, rgba(0,0,0,0.05) 100%)" }} />
        <div className="relative flex h-full flex-col justify-center px-7 sm:px-10">
          <h1 className="font-serif text-3xl font-medium text-white sm:text-4xl">Mis pedidos</h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/85">Consulta el estado de tus pedidos, rastrea envíos y revisa el historial completo de tus compras.</p>
        </div>
      </div>

      {/* KPIs como tarjetas: icono en cuadro + número + etiqueta + enlace de acción */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-[20px] bg-white p-4 shadow-[0_14px_40px_-30px_rgba(45,26,20,0.55)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${TERRA}14` }}>
              <k.icon className="h-5 w-5" strokeWidth={1.5} style={{ color: TERRA }} />
            </div>
            <p className="mt-3 font-serif text-3xl leading-none" style={{ color: CAFE }}>{k.n}</p>
            <p className="mt-1.5 text-xs" style={{ color: `${CAFE}88` }}>{k.label}</p>
            <Link href="/cuenta?seccion=pedidos" className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold transition-transform hover:translate-x-0.5" style={{ color: TERRA }}>
              {k.cta} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ))}
      </div>

      {/* Estado: cargando / empty state centrado / lista de pedidos */}
      {orders === null ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" style={{ color: TERRA }} /></div>
      ) : orders.length === 0 ? (
        <div className="flex min-h-[320px] w-full flex-col items-center justify-center rounded-[24px] bg-white px-8 py-16 text-center" style={{ border: "1px solid rgba(0,0,0,0.04)" }}>
          {/* Icono caja abierta con partículas decorativas */}
          <div className="relative mb-6 flex h-[120px] w-[120px] items-center justify-center">
            <div aria-hidden className="absolute inset-0 rounded-full" style={{ backgroundColor: `${TERRA}0D` }} />
            <PackageOpen className="relative h-20 w-20" strokeWidth={1.2} style={{ color: "#C49A7A" }} />
            <Sparkles aria-hidden className="absolute right-2 top-2 h-4 w-4" style={{ color: `${GOLD}` }} />
            <Sparkles aria-hidden className="absolute bottom-3 left-1 h-3 w-3" style={{ color: `${TERRA}99` }} />
            <span aria-hidden className="absolute left-3 top-6 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: `${TERRA}66` }} />
            <span aria-hidden className="absolute right-4 bottom-7 h-1 w-1 rounded-full" style={{ backgroundColor: `${GOLD}aa` }} />
          </div>
          <h2 className="font-serif text-3xl font-semibold sm:text-4xl" style={{ color: CAFE }}>Aún no tienes pedidos</h2>
          <p className="mt-3 max-w-[420px] text-sm leading-relaxed" style={{ color: `${CAFE}99` }}>
            Parece que todavía no has realizado ninguna compra. Explora nuestras fragancias y encuentra tu próximo favorito.
          </p>
          <Link href="/catalogo" className="mt-7 inline-flex h-12 items-center rounded-full px-7 text-sm font-bold transition-opacity hover:opacity-90" style={{ backgroundColor: TERRA, color: CREMA }}>
            Explorar aromas
          </Link>
        </div>
      ) : (
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: `${CAFE}55` }}>Última actividad</p>
          <ul className="divide-y" style={{ borderColor: `${CAFE}10` }}>
            {orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium" style={{ color: CAFE }}>{new Date(o.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}</p>
                  <p className="text-xs capitalize" style={{ color: `${CAFE}80` }}>{o.status}</p>
                </div>
                <p className="text-sm font-semibold" style={{ color: CAFE }}>{fmt(o.total)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <RecomendadosEditorial products={products} />
    </div>
  )
}

/* Recomendados editoriales — foto grande + notas, con "cursor" deslizante que
   sigue a la tarjeta bajo el puntero (mismo patrón que la navegación). */
function RecomendadosEditorial({ products }: { products: Product[] }) {
  const { toggleFavorite, isFavorite } = useFavorites()
  const trackRef = useRef<HTMLDivElement>(null)
  const [ind, setInd] = useState({ left: 0, top: 0, width: 0, height: 0, opacity: 0 })
  const list = products.slice(0, 6)
  if (!list.length) return null

  const moveTo = (el: HTMLElement) => setInd({ left: el.offsetLeft - 8, top: el.offsetTop - 8, width: el.offsetWidth + 16, height: el.offsetHeight + 16, opacity: 1 })
  const hide = () => setInd((p) => ({ ...p, opacity: 0 }))

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: `${CAFE}55` }}>Para ti</p>
      <h2 className="mt-1 font-serif text-2xl" style={{ color: CAFE }}>Aromas que podrían enamorarte</h2>
      <div ref={trackRef} onMouseLeave={hide} className="relative -mx-4 mt-5 flex snap-x gap-5 overflow-x-auto px-4 pb-3 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Indicador deslizante (detrás de las tarjetas) */}
        <span aria-hidden className="pointer-events-none absolute z-0 rounded-[24px]"
          style={{ left: ind.left, top: ind.top, width: ind.width, height: ind.height, opacity: ind.opacity, backgroundColor: "#fff", boxShadow: "0 22px 50px -28px rgba(45,26,20,0.55)", transition: "left 0.34s cubic-bezier(0.22,1,0.36,1), top 0.34s cubic-bezier(0.22,1,0.36,1), width 0.34s cubic-bezier(0.22,1,0.36,1), height 0.34s cubic-bezier(0.22,1,0.36,1), opacity 0.2s ease" }} />
        {list.map((p) => {
          const notes = NOTES_MAP[p.slug] || []
          return (
            <div key={p.id} onMouseEnter={(e) => moveTo(e.currentTarget)} className="relative z-10 w-[210px] flex-shrink-0 snap-start">
              <Link href={`/productos/${p.slug}`} className="group relative block aspect-[3/4] overflow-hidden rounded-[20px]" style={{ backgroundColor: `${TERRA}0D` }}>
                <Image src={p.image_url || "/images/placeholder.jpg"} alt={p.name} fill sizes="210px" className="object-contain p-3 transition-transform duration-700 group-hover:scale-[1.04]" />
                <button onClick={(e) => { e.preventDefault(); toggleFavorite(p) }} className="absolute right-3 top-3 rounded-full bg-white/85 p-2 backdrop-blur" aria-label="Favorito">
                  <Heart className={`h-4 w-4 ${isFavorite(p.id) ? "fill-red-500 text-red-500" : ""}`} style={{ color: isFavorite(p.id) ? undefined : `${CAFE}80` }} />
                </button>
              </Link>
              <p className="mt-3 font-serif text-[17px] leading-tight" style={{ color: CAFE }}>{p.name}</p>
              {notes.length > 0 && <p className="mt-1 text-[12px] leading-snug" style={{ color: `${CAFE}80` }}>{notes.slice(0, 3).join(" · ")}</p>}
              <p className="mt-1.5 text-sm font-semibold" style={{ color: TERRA }}>{fmt(p.price)}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────────── OTRAS SECCIONES ─────────────────────────── */
function Panel({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="font-serif text-3xl font-medium sm:text-4xl" style={{ color: CAFE }}>{title}</h1>
      {desc && <p className="mt-2 max-w-md text-sm leading-relaxed" style={{ color: `${CAFE}99` }}>{desc}</p>}
      <div className="mt-7">{children}</div>
    </div>
  )
}

/* Sesión real (auth.sessions) + utilidades de presentación de dispositivo */
type Sess = { id: string; user_agent: string | null; ip: string | null; created_at: string; updated_at: string; refreshed_at: string | null }
function deviceInfo(ua: string | null): { label: string; icon: LucideIcon } {
  const s = ua || ""
  let os = "Dispositivo", icon: LucideIcon = Monitor
  if (/iPhone/i.test(s)) { os = "iPhone"; icon = Smartphone }
  else if (/iPad/i.test(s)) { os = "iPad"; icon = Tablet }
  else if (/Android/i.test(s)) { os = /Mobile/i.test(s) ? "Android" : "Tablet Android"; icon = /Mobile/i.test(s) ? Smartphone : Tablet }
  else if (/Windows/i.test(s)) { os = "Windows PC"; icon = Monitor }
  else if (/Macintosh|Mac OS/i.test(s)) { os = "Mac"; icon = Monitor }
  else if (/Linux/i.test(s)) { os = "Linux"; icon = Monitor }
  const browser = /Edg/i.test(s) ? "Edge" : /OPR|Opera/i.test(s) ? "Opera" : /Chrome/i.test(s) ? "Chrome" : /Firefox/i.test(s) ? "Firefox" : /Safari/i.test(s) ? "Safari" : ""
  return { label: browser ? `${os} · ${browser}` : os, icon }
}
function sessAgo(s: Sess) {
  const d = new Date(s.refreshed_at || s.updated_at || s.created_at)
  return d.toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

/* Máscara de fecha: solo dígitos, inserta "/" como DD/MM/AAAA de forma natural */
function formatBirth(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 8)
  let out = d.slice(0, 2)
  if (d.length > 2) out += "/" + d.slice(2, 4)
  if (d.length > 4) out += "/" + d.slice(4, 8)
  return out
}

/* Tarjeta premium reutilizable (Mis datos) */
function LuxCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[24px] bg-white p-6 sm:p-8" style={{ border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 22px 60px -46px rgba(45,26,20,0.5)" }}>
      {children}
    </div>
  )
}
function LuxHead({ icon: Icon, title, desc, action }: { icon: LucideIcon; title: string; desc: string; action?: React.ReactNode }) {
  return (
    <div className="mb-7 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${TERRA}14` }}>
          <Icon className="h-5 w-5" strokeWidth={1.6} style={{ color: TERRA }} />
        </div>
        <div>
          <h2 className="font-serif text-xl" style={{ color: CAFE }}>{title}</h2>
          <p className="mt-0.5 text-sm leading-snug" style={{ color: `${CAFE}88` }}>{desc}</p>
        </div>
      </div>
      {action}
    </div>
  )
}
/* Campo: muestra valor (lectura) o input (edición), con icono e altura 56px */
function DataField({ icon: Icon, label, value, onChange, editable, type = "text", placeholder, disabled, inputMode, maxLength }: {
  icon: LucideIcon; label: string; value: string; onChange?: (v: string) => void; editable: boolean; type?: string; placeholder?: string; disabled?: boolean; inputMode?: "text" | "numeric" | "tel" | "email"; maxLength?: number
}) {
  const active = editable && !disabled
  return (
    <div>
      <label className="mb-2 block text-xs font-medium" style={{ color: `${CAFE}80` }}>{label}</label>
      <div className="flex items-center gap-3 rounded-2xl border px-4 transition-colors" style={{ minHeight: 56, borderColor: active ? TERRA : `${CAFE}12`, backgroundColor: active ? "#fff" : `${CAFE}04` }}>
        <Icon className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={1.6} style={{ color: active ? TERRA : `${CAFE}55` }} />
        <input
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={!active}
          type={type}
          inputMode={inputMode}
          maxLength={maxLength}
          placeholder={placeholder}
          className="h-14 flex-1 bg-transparent text-sm outline-none disabled:cursor-default"
          style={{ color: disabled ? `${CAFE}80` : CAFE }}
        />
      </div>
    </div>
  )
}

function SeccionDatos({ email }: { email: string }) {
  const { user } = useAuth()
  const md = (user?.user_metadata ?? {}) as Record<string, unknown>
  const fullName = (md.full_name as string) || ""
  const initial = {
    first: (md.first_name as string) || fullName.split(" ")[0] || "",
    last: (md.last_name as string) || fullName.split(" ").slice(1).join(" ") || "",
    phone: (md.phone as string) || "",
    birth: (md.birthdate as string) || "",
  }
  const [first, setFirst] = useState(initial.first)
  const [last, setLast] = useState(initial.last)
  const [phone, setPhone] = useState(initial.phone)
  const [birth, setBirth] = useState(initial.birth)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState(false)
  const [sessions, setSessions] = useState<Sess[] | null>(null)

  const addresses = (md.addresses as Address[]) || []
  const principal = addresses[0]

  // Sesiones reales del usuario (auth.sessions vía RPC, aisladas por auth.uid()).
  async function loadSessions() {
    const { data } = await getSupabaseBrowser().rpc("get_my_sessions")
    setSessions((data as Sess[]) ?? [])
  }
  useEffect(() => { loadSessions() }, [])
  async function revokeSession(id: string) {
    if (!window.confirm("¿Cerrar la sesión en este dispositivo?")) return
    await getSupabaseBrowser().rpc("revoke_session", { sid: id })
    loadSessions()
  }

  async function save() {
    setSaving(true); setOk(false)
    const full_name = [first.trim(), last.trim()].filter(Boolean).join(" ")
    await getSupabaseBrowser().auth.updateUser({ data: { first_name: first.trim(), last_name: last.trim(), full_name, phone: phone.trim(), birthdate: birth.trim() } })
    setSaving(false); setEditing(false); setOk(true); setTimeout(() => setOk(false), 2800)
  }
  function cancel() {
    setFirst(initial.first); setLast(initial.last); setPhone(initial.phone); setBirth(initial.birth); setEditing(false)
  }

  return (
    <div className="space-y-6">
      {/* Cabecera + tarjeta de seguridad */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium sm:text-4xl" style={{ color: CAFE }}>Mis datos</h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed" style={{ color: `${CAFE}99` }}>Actualiza tu información personal y administra la configuración de tu cuenta.</p>
        </div>
        <div className="flex max-w-xs items-start gap-3 rounded-2xl px-4 py-3" style={{ backgroundColor: `${TERRA}10` }}>
          <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0" strokeWidth={1.6} style={{ color: TERRA }} />
          <div>
            <p className="text-[13px] font-semibold" style={{ color: CAFE }}>Tu información está segura</p>
            <p className="mt-0.5 text-xs leading-snug" style={{ color: `${CAFE}88` }}>Protegida mediante cifrado y acceso seguro.</p>
          </div>
        </div>
      </div>

      {/* ── Información personal ── */}
      <LuxCard>
        <LuxHead icon={UserIcon} title="Información personal" desc="Gestiona la información básica asociada a tu cuenta."
          action={
            editing ? (
              <div className="flex items-center gap-2">
                <button onClick={cancel} className="rounded-full px-3 py-2 text-xs font-semibold" style={{ color: `${CAFE}99` }}>Cancelar</button>
                <button onClick={save} disabled={saving} className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold disabled:opacity-60" style={{ backgroundColor: TERRA, color: CREMA }}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />} Guardar
                </button>
              </div>
            ) : (
              <button onClick={() => setEditing(true)} className="flex flex-shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition-colors hover:bg-black/[0.03]" style={{ borderColor: `${CAFE}15`, color: TERRA }}>
                <Pencil className="h-3.5 w-3.5" /> Editar
              </button>
            )
          }
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <DataField icon={UserIcon} label="Nombre" value={first} onChange={setFirst} editable={editing} placeholder="Tu nombre" />
          <DataField icon={UserIcon} label="Apellido" value={last} onChange={setLast} editable={editing} placeholder="Tu apellido" />
          <DataField icon={Mail} label="Correo electrónico" value={email} editable={editing} disabled />
          <DataField icon={Calendar} label="Fecha de nacimiento" value={birth} onChange={(v) => setBirth(formatBirth(v))} editable={editing} placeholder="DD/MM/AAAA" inputMode="numeric" maxLength={10} />
          <DataField icon={Phone} label="Teléfono" value={phone} onChange={setPhone} editable={editing} placeholder="+57 300 000 0000" type="tel" />
        </div>
        {ok && <p className="mt-4 flex items-center gap-1.5 text-sm text-green-600"><CheckCircle className="h-4 w-4" /> Cambios guardados</p>}
      </LuxCard>

      {/* ── Direcciones ── */}
      <LuxCard>
        <LuxHead icon={MapPin} title="Direcciones" desc="Administra tus direcciones de envío y facturación."
          action={
            <Link href="/cuenta?seccion=direcciones" className="flex flex-shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition-colors hover:bg-black/[0.03]" style={{ borderColor: `${CAFE}15`, color: TERRA }}>
              Gestionar <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        {principal ? (
          <div className="rounded-2xl border p-5" style={{ borderColor: `${CAFE}10`, backgroundColor: `${CAFE}04` }}>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: CAFE }}>{principal.label || "Dirección principal"}</span>
              <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ backgroundColor: `${TERRA}1a`, color: TERRA }}>Principal</span>
            </div>
            <div className="grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2" style={{ color: `${CAFE}99` }}>
              <p><span style={{ color: `${CAFE}66` }}>Dirección: </span>{principal.line}</p>
              <p><span style={{ color: `${CAFE}66` }}>Ciudad: </span>{principal.city}</p>
              <p><span style={{ color: `${CAFE}66` }}>Departamento: </span>{principal.department || "—"}</p>
              <p><span style={{ color: `${CAFE}66` }}>Recibe: </span>{principal.recipient || "—"}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-2xl border border-dashed p-5" style={{ borderColor: `${CAFE}20` }}>
            <p className="text-sm" style={{ color: `${CAFE}99` }}>Aún no tienes direcciones guardadas.</p>
            <Link href="/cuenta?seccion=direcciones" className="flex-shrink-0 rounded-full px-4 py-2 text-xs font-bold" style={{ backgroundColor: TERRA, color: CREMA }}>Añadir</Link>
          </div>
        )}
      </LuxCard>

      {/* ── Seguridad ── */}
      <LuxCard>
        <LuxHead icon={ShieldCheck} title="Seguridad" desc="Mantén tu cuenta protegida." />

        {/* Cambiar contraseña */}
        <Link href="/cuenta?seccion=config" className="group flex items-center justify-between gap-3 rounded-2xl border p-5 transition-all hover:shadow-[0_18px_40px_-30px_rgba(45,26,20,0.5)]" style={{ borderColor: `${CAFE}10`, backgroundColor: `${CAFE}03` }}>
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 flex-shrink-0" strokeWidth={1.6} style={{ color: TERRA }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: CAFE }}>Cambiar contraseña</p>
              <p className="mt-0.5 text-xs leading-snug" style={{ color: `${CAFE}88` }}>Actualiza tu contraseña periódicamente para mantener tu cuenta segura.</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: `${CAFE}40` }} />
        </Link>

        {/* Sesiones activas — dispositivos reales conectados */}
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <Monitor className="h-4 w-4" strokeWidth={1.6} style={{ color: TERRA }} />
            <p className="text-sm font-semibold" style={{ color: CAFE }}>Sesiones activas</p>
          </div>
          {sessions === null ? (
            <div className="flex py-4"><Loader2 className="h-5 w-5 animate-spin" style={{ color: TERRA }} /></div>
          ) : sessions.length === 0 ? (
            <p className="text-sm" style={{ color: `${CAFE}88` }}>No hay sesiones activas registradas.</p>
          ) : (
            <ul className="space-y-2">
              {sessions.map((s) => {
                const { label, icon: DIcon } = deviceInfo(s.user_agent)
                const isCurrent = typeof navigator !== "undefined" && s.user_agent === navigator.userAgent
                return (
                  <li key={s.id} className="flex items-center justify-between gap-3 rounded-2xl border p-4" style={{ borderColor: `${CAFE}10`, backgroundColor: `${CAFE}03` }}>
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${TERRA}12` }}>
                        <DIcon className="h-[18px] w-[18px]" strokeWidth={1.6} style={{ color: TERRA }} />
                      </div>
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-sm font-medium" style={{ color: CAFE }}>
                          {label}
                          {isCurrent && <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ backgroundColor: `${TERRA}1a`, color: TERRA }}>Este dispositivo</span>}
                        </p>
                        <p className="truncate text-xs" style={{ color: `${CAFE}80` }}>{s.ip ? `IP ${s.ip} · ` : ""}Última actividad {sessAgo(s)}</p>
                      </div>
                    </div>
                    {!isCurrent && (
                      <button onClick={() => revokeSession(s.id)} className="flex-shrink-0 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold transition-colors hover:bg-red-50/60" style={{ borderColor: `${CAFE}15`, color: "#dc2626" }}>
                        Cerrar
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </LuxCard>
    </div>
  )
}

type Address = { label: string; recipient: string; line: string; city: string; department: string; phone: string; postal?: string; country?: string }
const EMPTY_ADDR: Address = { label: "", recipient: "", line: "", city: "", department: "", phone: "", postal: "", country: "Colombia" }
function SeccionDirecciones() {
  const { user } = useAuth()
  const [list, setList] = useState<Address[]>((user?.user_metadata?.addresses as Address[]) || [])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<Address>(EMPTY_ADDR)
  const [saving, setSaving] = useState(false)
  async function persist(next: Address[]) { setSaving(true); await getSupabaseBrowser().auth.updateUser({ data: { addresses: next } }); setList(next); setSaving(false) }
  async function add(e: React.FormEvent) { e.preventDefault(); if (!form.line || !form.city) return; await persist([...list, form]); setForm(EMPTY_ADDR); setAdding(false) }
  // La primera dirección de la lista es la principal; reordenar la cambia.
  const makePrincipal = (i: number) => persist([list[i], ...list.filter((_, idx) => idx !== i)])
  const cls = "h-12 w-full rounded-2xl border bg-white px-4 text-sm outline-none focus:border-[#A67163]"
  return (
    <Panel title="Direcciones" desc="Administra tus direcciones de envío y facturación. La primera es tu dirección principal.">
      {list.length === 0 && !adding && <div className="rounded-2xl border border-dashed py-10 text-center text-sm" style={{ borderColor: `${CAFE}20`, color: `${CAFE}99` }}>Aún no tienes direcciones guardadas.</div>}
      {list.length > 0 && (
        <ul className="space-y-3">
          {list.map((a, i) => (
            <li key={i} className="rounded-2xl bg-white p-5 shadow-[0_12px_36px_-30px_rgba(45,26,20,0.5)]" style={{ border: "1px solid rgba(0,0,0,0.05)" }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 text-sm" style={{ color: CAFE }}>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    {a.label && <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: TERRA }}>{a.label}</span>}
                    <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ backgroundColor: i === 0 ? `${TERRA}1a` : `${CAFE}0d`, color: i === 0 ? TERRA : `${CAFE}88` }}>{i === 0 ? "Principal" : "Secundaria"}</span>
                  </div>
                  {a.recipient && <p className="font-medium">{a.recipient}</p>}
                  <p style={{ color: `${CAFE}99` }}>{a.line}, {a.city}{a.department ? `, ${a.department}` : ""}{a.postal ? ` · ${a.postal}` : ""}</p>
                  <p style={{ color: `${CAFE}80` }}>{a.country || "Colombia"}{a.phone ? ` · ${a.phone}` : ""}</p>
                </div>
                <button onClick={() => persist(list.filter((_, idx) => idx !== i))} className="flex-shrink-0 rounded-full p-2 text-[#2D1A14]/30 transition-colors hover:text-red-500" aria-label="Eliminar"><Trash2 className="h-4 w-4" /></button>
              </div>
              {i !== 0 && (
                <button onClick={() => makePrincipal(i)} disabled={saving} className="mt-3 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold transition-colors hover:bg-black/[0.03] disabled:opacity-60" style={{ borderColor: `${CAFE}15`, color: TERRA }}>
                  <CheckCircle className="h-3.5 w-3.5" /> Hacer principal
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {adding ? (
        <form onSubmit={add} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Etiqueta (Casa, Oficina)" className={cls} style={{ borderColor: `${CAFE}15`, color: CAFE }} />
          <input value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} placeholder="Quién recibe" className={cls} style={{ borderColor: `${CAFE}15`, color: CAFE }} />
          <input value={form.line} onChange={(e) => setForm({ ...form, line: e.target.value })} placeholder="Dirección" required className={`${cls} sm:col-span-2`} style={{ borderColor: `${CAFE}15`, color: CAFE }} />
          <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Ciudad" required className={cls} style={{ borderColor: `${CAFE}15`, color: CAFE }} />
          <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Departamento" className={cls} style={{ borderColor: `${CAFE}15`, color: CAFE }} />
          <input value={form.postal} onChange={(e) => setForm({ ...form, postal: e.target.value })} placeholder="Código postal" className={cls} style={{ borderColor: `${CAFE}15`, color: CAFE }} />
          <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="País" className={cls} style={{ borderColor: `${CAFE}15`, color: CAFE }} />
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Teléfono" inputMode="tel" className={`${cls} sm:col-span-2`} style={{ borderColor: `${CAFE}15`, color: CAFE }} />
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={saving} className="flex h-12 items-center rounded-2xl px-6 text-sm font-bold disabled:opacity-60" style={{ backgroundColor: CAFE, color: CREMA }}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar dirección"}</button>
            <button type="button" onClick={() => { setAdding(false); setForm(EMPTY_ADDR) }} className="h-12 rounded-2xl px-5 text-sm font-medium" style={{ color: `${CAFE}99` }}>Cancelar</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setAdding(true)} className="mt-4 inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-black/5" style={{ borderColor: TERRA, color: TERRA }}><Plus className="h-4 w-4" /> Añadir dirección</button>
      )}
    </Panel>
  )
}

function SeccionConfig() {
  const [pass, setPass] = useState(""); const [confirm, setConfirm] = useState("")
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)
  async function changePass(e: React.FormEvent) {
    e.preventDefault(); setMsg(null)
    if (pass.length < 6) return setMsg({ type: "err", text: "La contraseña debe tener al menos 6 caracteres." })
    if (pass !== confirm) return setMsg({ type: "err", text: "Las contraseñas no coinciden." })
    setSaving(true)
    const { error } = await getSupabaseBrowser().auth.updateUser({ password: pass }); setSaving(false)
    if (error) setMsg({ type: "err", text: "No se pudo cambiar la contraseña." })
    else { setMsg({ type: "ok", text: "Contraseña actualizada." }); setPass(""); setConfirm("") }
  }
  const cls = "h-12 w-full rounded-2xl border bg-white px-4 text-sm outline-none focus:border-[#A67163]"
  return (
    <Panel title="Configuración" desc="Seguridad de tu cuenta.">
      {msg && <div className="mb-4 rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: msg.type === "err" ? "#fef2f2" : "#f0fdf4", color: msg.type === "err" ? "#b91c1c" : "#15803d" }}>{msg.text}</div>}
      <form onSubmit={changePass} className="max-w-sm space-y-3">
        <Labeled label="Nueva contraseña"><input type="password" value={pass} onChange={(e) => setPass(e.target.value)} minLength={6} required placeholder="Mín. 6 caracteres" className={cls} style={{ borderColor: `${CAFE}15`, color: CAFE }} /></Labeled>
        <Labeled label="Confirmar contraseña"><input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required placeholder="Repite la contraseña" className={cls} style={{ borderColor: `${CAFE}15`, color: CAFE }} /></Labeled>
        <button type="submit" disabled={saving} className="flex h-12 items-center rounded-2xl px-6 text-sm font-bold disabled:opacity-60" style={{ backgroundColor: CAFE, color: CREMA }}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Actualizar contraseña"}</button>
      </form>
    </Panel>
  )
}

/* ─────────────────────────── LOGIN / SIGNUP ─────────────────────────── */
function AuthForm() {
  const params = useSearchParams()
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: "ok" | "err" | "info"; text: string } | null>(null)
  useEffect(() => { if (params.get("error")) setMsg({ type: "err", text: "No se pudo verificar el enlace. Intenta de nuevo." }) }, [params])
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setMsg(null)
    const supabase = getSupabaseBrowser()
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
        if (error) throw error
        setMsg({ type: "info", text: "Te enviamos un correo de verificación. Ábrelo para activar tu cuenta." })
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw new Error(/confirm/i.test(error.message) ? "Verifica tu correo antes de iniciar sesión." : "Correo o contraseña incorrectos.")
        window.location.assign("/"); return
      }
    } catch (err) { setMsg({ type: "err", text: err instanceof Error ? err.message : "Ocurrió un error." }) } finally { setLoading(false) }
  }
  return (
    <div className="overflow-hidden rounded-3xl border bg-white shadow-[0_20px_60px_-30px_rgba(45,26,20,0.35)]" style={{ borderColor: `${CAFE}12` }}>
      <div className="h-1.5 w-full bg-gradient-to-r from-[#A67163] via-[#C4958A] to-[#A67163]" />
      <div className="p-7 sm:p-9">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo-cliche.png" alt="Cliché" className="mx-auto mb-5 h-9 w-auto object-contain" />
        <h1 className="text-center font-serif text-3xl font-medium" style={{ color: CAFE }}>{mode === "login" ? "Bienvenida de vuelta" : "Crea tu cuenta"}</h1>
        <p className="mt-2 text-center text-sm" style={{ color: `${CAFE}99` }}>{mode === "login" ? "Accede a tus pedidos y tu carrito guardado." : "Guarda tu carrito y sigue tus pedidos."}</p>
        {msg && (
          <div className="mt-5 flex items-start gap-2 rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: msg.type === "err" ? "#fef2f2" : msg.type === "ok" ? "#f0fdf4" : `${TERRA}12`, color: msg.type === "err" ? "#b91c1c" : msg.type === "ok" ? "#15803d" : CAFE }}>
            {msg.type === "err" ? <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /> : <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />}<span>{msg.text}</span>
          </div>
        )}
        <form onSubmit={submit} className="mt-6 space-y-3">
          <div className="flex items-center gap-2 rounded-xl border px-3 focus-within:border-[#A67163]" style={{ borderColor: `${CAFE}20` }}><Mail className="h-4 w-4" style={{ color: `${CAFE}55` }} /><input type="email" inputMode="email" required placeholder="Tu correo electrónico" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 flex-1 bg-transparent text-sm outline-none" style={{ color: CAFE }} /></div>
          <div className="flex items-center gap-2 rounded-xl border px-3 focus-within:border-[#A67163]" style={{ borderColor: `${CAFE}20` }}><Lock className="h-4 w-4" style={{ color: `${CAFE}55` }} /><input type="password" required minLength={6} placeholder="Contraseña (mín. 6)" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 flex-1 bg-transparent text-sm outline-none" style={{ color: CAFE }} /></div>
          <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center rounded-xl text-sm font-bold tracking-wide transition-opacity disabled:opacity-60" style={{ backgroundColor: TERRA, color: CREMA }}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</button>
        </form>
        <p className="mt-5 text-center text-xs" style={{ color: `${CAFE}99` }}>{mode === "login" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMsg(null) }} className="font-semibold underline-offset-2 hover:underline" style={{ color: TERRA }}>{mode === "login" ? "Créala aquí" : "Inicia sesión"}</button>
        </p>
      </div>
    </div>
  )
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: `${CAFE}70` }}>{label}</label>{children}</div>
}
