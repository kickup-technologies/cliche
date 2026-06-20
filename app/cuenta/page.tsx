"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import {
  Mail, Lock, LogOut, Package, MapPin, User as UserIcon, Settings, CheckCircle, AlertCircle,
  Loader2, Plus, Trash2, CreditCard, Heart, Star, Bell, Truck, RotateCcw, ShieldCheck,
  Crown, ChevronRight, ArrowRight,
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
const HELP_IMG = "/images/products/tao.png"
const HERO_IMG = "/images/popup-mahai.png"

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
  { id: "pagos", label: "Métodos de pago", icon: CreditCard },
  { id: "deseos", label: "Lista de deseos", icon: Heart },
  { id: "resenas", label: "Mis reseñas", icon: Star },
  { id: "notificaciones", label: "Notificaciones", icon: Bell },
  { id: "config", label: "Configuración", icon: Settings },
] as const
type SecId = (typeof NAV)[number]["id"]

function Dashboard({ email, createdAt, signOut }: { email: string; createdAt?: string; signOut: () => Promise<void> }) {
  const params = useSearchParams()
  const seccion = (params.get("seccion") || "pedidos") as SecId
  const { count: favCount } = useFavorites()
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
      <div className="grid gap-x-12 gap-y-8 lg:grid-cols-[330px_1fr]">
        {/* ── EXPERIENCIA (no menú): perfil → stats → aroma → navegación ── */}
        <div>
          <ProfileCard email={email} createdAt={createdAt} orders={orders} />
          <QuickStats orders={orders} favCount={favCount} />
          <AromaWow product={products[0]} />

          <p className="mb-2 mt-8 px-1 text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: `${CAFE}55` }}>Tu cuenta</p>
          <nav className="flex flex-col">
            {NAV.map(({ id, label, icon: Icon }) => {
              const active = seccion === id
              return (
                <Link key={id} href={`/cuenta?seccion=${id}`}
                  className="group flex h-[52px] items-center gap-3 rounded-2xl px-3 text-sm font-medium transition-all"
                  style={{ backgroundColor: active ? "#fff" : "transparent", color: active ? TERRA : CAFE, boxShadow: active ? "0 12px 30px -20px rgba(45,26,20,0.45)" : "none" }}>
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} style={{ color: active ? TERRA : `${CAFE}88` }} />
                  <span className="flex-1">{label}</span>
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" style={{ color: `${CAFE}30` }} />
                </Link>
              )
            })}
            <button onClick={() => signOut()} className="flex h-[52px] items-center gap-3 rounded-2xl px-3 text-sm font-medium text-red-600/90 transition-colors hover:bg-red-50/60">
              <LogOut className="h-[18px] w-[18px]" strokeWidth={1.5} /> <span className="flex-1 text-left">Cerrar sesión</span>
            </button>
          </nav>

          <HelpCard />
        </div>

        {/* ── CONTENIDO ── */}
        <div className="min-w-0">
          {seccion === "pedidos" && <SeccionPedidos orders={orders} products={products} />}
          {seccion === "datos" && <SeccionDatos email={email} />}
          {seccion === "direcciones" && <SeccionDirecciones />}
          {seccion === "pagos" && <SeccionPagos />}
          {seccion === "deseos" && <SeccionDeseos />}
          {seccion === "resenas" && <SeccionResenas />}
          {seccion === "notificaciones" && <SeccionNotificaciones />}
          {seccion === "config" && <SeccionConfig />}
        </div>
      </div>
    </section>
  )
}

/* Tarjeta de membresía — foto Romeo y Julieta + overlay */
function ProfileCard({ email, createdAt, orders }: { email: string; createdAt?: string; orders: Order[] | null }) {
  const name = email.split("@")[0]
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

/* Stats rápidos — sin cajas, flotando sobre el fondo */
function QuickStats({ orders, favCount }: { orders: Order[] | null; favCount: number }) {
  const pedidos = orders?.length ?? 0
  const devoluciones = orders?.filter(o => o.status === "cancelled").length ?? 0
  const items = [{ n: pedidos, l: "Pedidos" }, { n: favCount, l: "Favoritos" }, { n: devoluciones, l: "Devoluciones" }]
  return (
    <div className="mt-5 flex items-center justify-between px-2">
      {items.map((it, i) => (
        <div key={it.l} className="flex flex-1 flex-col items-center" style={{ borderLeft: i ? `1px solid ${CAFE}14` : "none" }}>
          <span className="font-serif text-2xl" style={{ color: CAFE }}>{it.n}</span>
          <span className="text-[11px]" style={{ color: `${CAFE}80` }}>{it.l}</span>
        </div>
      ))}
    </div>
  )
}

/* Elemento "wow" — aroma recomendado con foto grande */
function AromaWow({ product }: { product?: Product }) {
  if (!product) return null
  const notes = NOTES_MAP[product.slug] || []
  return (
    <Link href={`/productos/${product.slug}`} className="group mt-6 block overflow-hidden rounded-[24px] bg-white shadow-[0_18px_50px_-32px_rgba(45,26,20,0.5)]">
      <div className="relative aspect-[4/3] w-full overflow-hidden" style={{ backgroundColor: `${TERRA}0D` }}>
        <Image src={product.image_url || "/images/placeholder.jpg"} alt={product.name} fill sizes="330px" className="object-contain p-4 transition-transform duration-700 group-hover:scale-105" />
        <span className="absolute left-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide backdrop-blur" style={{ color: TERRA }}>Tu aroma recomendado</span>
      </div>
      <div className="p-4">
        <p className="font-serif text-lg leading-tight" style={{ color: CAFE }}>{product.name}</p>
        {notes.length > 0 && <p className="mt-0.5 text-xs" style={{ color: `${CAFE}80` }}>{notes.slice(0, 3).join(" · ")}</p>}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm font-semibold" style={{ color: TERRA }}>{fmt(product.price)}</span>
          <span className="flex items-center gap-1 text-xs font-semibold transition-transform group-hover:translate-x-0.5" style={{ color: CAFE }}>Descubrir <ArrowRight className="h-3.5 w-3.5" /></span>
        </div>
      </div>
    </Link>
  )
}

function HelpCard() {
  return (
    <div className="relative mt-6 overflow-hidden rounded-[24px] p-5 pr-24" style={{ backgroundColor: `${TERRA}12` }}>
      <Image src={HELP_IMG} alt="" width={110} height={110} className="pointer-events-none absolute -bottom-2 -right-3 h-28 w-28 object-contain" />
      <p className="font-serif text-lg" style={{ color: CAFE }}>¿Necesitas ayuda?</p>
      <p className="mt-1 text-xs" style={{ color: `${CAFE}99` }}>Habla con un asesor</p>
      <Link href="/contacto" className="mt-3 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: TERRA }}>
        Contáctanos <ArrowRight className="h-3.5 w-3.5" />
      </Link>
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
    { n: realizados, label: "Pedidos realizados", icon: Package },
    { n: enCamino, label: "Envíos en camino", icon: Truck },
    { n: entregados, label: "Entregados", icon: CheckCircle },
    { n: devoluciones, label: "Devoluciones", icon: RotateCcw },
  ]
  return (
    <div className="space-y-10">
      {/* Encabezado compuesto con foto grande (sin contenedor) */}
      <div className="flex items-center gap-6">
        <div className="flex-1">
          <h1 className="font-serif text-3xl font-medium sm:text-4xl" style={{ color: CAFE }}>Mis pedidos</h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed" style={{ color: `${CAFE}99` }}>Consulta el estado de tus pedidos, rastrea envíos y revisa el historial completo de tus compras.</p>
        </div>
        <div className="relative hidden h-36 w-[34%] flex-shrink-0 overflow-hidden rounded-[24px] sm:block">
          <Image src={HERO_IMG} alt="" fill className="object-cover" sizes="280px" />
        </div>
      </div>

      {/* KPIs flotando sobre el fondo (sin bordes pesados) */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label}>
            <k.icon className="h-5 w-5" strokeWidth={1.4} style={{ color: TERRA }} />
            <p className="mt-2 font-serif text-3xl" style={{ color: CAFE }}>{k.n}</p>
            <p className="text-xs" style={{ color: `${CAFE}88` }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Última actividad */}
      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: `${CAFE}55` }}>Última actividad</p>
        {orders === null ? (
          <div className="flex py-6"><Loader2 className="h-5 w-5 animate-spin" style={{ color: TERRA }} /></div>
        ) : orders.length === 0 ? (
          <div className="flex items-center gap-4 rounded-[20px] px-5 py-4" style={{ backgroundColor: `${TERRA}0D` }}>
            <Package className="h-7 w-7 flex-shrink-0" strokeWidth={1.3} style={{ color: TERRA }} />
            <p className="flex-1 text-sm" style={{ color: `${CAFE}99` }}>Aún no tienes pedidos. Descubre tu próximo aroma.</p>
            <Link href="/catalogo" className="flex-shrink-0 rounded-full px-5 py-2.5 text-xs font-bold" style={{ backgroundColor: TERRA, color: CREMA }}>Explorar</Link>
          </div>
        ) : (
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
        )}
      </div>

      <RecomendadosEditorial products={products} />
    </div>
  )
}

/* Recomendados editoriales — foto grande + notas */
function RecomendadosEditorial({ products }: { products: Product[] }) {
  const { toggleFavorite, isFavorite } = useFavorites()
  const list = products.slice(0, 6)
  if (!list.length) return null
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: `${CAFE}55` }}>Para ti</p>
      <h2 className="mt-1 font-serif text-2xl" style={{ color: CAFE }}>Aromas que podrían enamorarte</h2>
      <div className="-mx-4 mt-5 flex snap-x gap-5 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {list.map((p) => {
          const notes = NOTES_MAP[p.slug] || []
          return (
            <div key={p.id} className="w-[210px] flex-shrink-0 snap-start">
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

function SeccionDatos({ email }: { email: string }) {
  const { user } = useAuth()
  const [name, setName] = useState((user?.user_metadata?.full_name as string) || "")
  const [phone, setPhone] = useState((user?.user_metadata?.phone as string) || "")
  const [saving, setSaving] = useState(false); const [ok, setOk] = useState(false)
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setOk(false)
    await getSupabaseBrowser().auth.updateUser({ data: { full_name: name.trim(), phone: phone.trim() } })
    setSaving(false); setOk(true); setTimeout(() => setOk(false), 2500)
  }
  const cls = "h-12 w-full rounded-2xl border bg-white px-4 text-sm outline-none focus:border-[#A67163]"
  return (
    <Panel title="Mis datos" desc="Actualiza tu información personal.">
      <form onSubmit={save} className="max-w-lg space-y-4">
        <Labeled label="Nombre completo"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" className={cls} style={{ borderColor: `${CAFE}15`, color: CAFE }} /></Labeled>
        <Labeled label="Teléfono"><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="Tu teléfono" className={cls} style={{ borderColor: `${CAFE}15`, color: CAFE }} /></Labeled>
        <Labeled label="Correo electrónico"><input value={email} disabled className="h-12 w-full rounded-2xl border bg-black/[0.03] px-4 text-sm outline-none" style={{ borderColor: `${CAFE}12`, color: `${CAFE}80` }} /></Labeled>
        <div className="flex items-center gap-3 pt-1">
          <button type="submit" disabled={saving} className="flex h-12 items-center justify-center rounded-2xl px-7 text-sm font-bold disabled:opacity-60" style={{ backgroundColor: CAFE, color: CREMA }}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar cambios"}</button>
          {ok && <span className="flex items-center gap-1 text-sm text-green-600"><CheckCircle className="h-4 w-4" /> Guardado</span>}
        </div>
      </form>
    </Panel>
  )
}

type Address = { label: string; recipient: string; line: string; city: string; department: string; phone: string }
function SeccionDirecciones() {
  const { user } = useAuth()
  const [list, setList] = useState<Address[]>((user?.user_metadata?.addresses as Address[]) || [])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<Address>({ label: "", recipient: "", line: "", city: "", department: "", phone: "" })
  const [saving, setSaving] = useState(false)
  async function persist(next: Address[]) { setSaving(true); await getSupabaseBrowser().auth.updateUser({ data: { addresses: next } }); setList(next); setSaving(false) }
  async function add(e: React.FormEvent) { e.preventDefault(); if (!form.line || !form.city) return; await persist([...list, form]); setForm({ label: "", recipient: "", line: "", city: "", department: "", phone: "" }); setAdding(false) }
  const cls = "h-12 w-full rounded-2xl border bg-white px-4 text-sm outline-none focus:border-[#A67163]"
  return (
    <Panel title="Direcciones" desc="Tus direcciones de envío guardadas.">
      {list.length === 0 && !adding && <div className="rounded-2xl border border-dashed py-10 text-center text-sm" style={{ borderColor: `${CAFE}20`, color: `${CAFE}99` }}>Aún no tienes direcciones guardadas.</div>}
      {list.length > 0 && (
        <ul className="space-y-2">
          {list.map((a, i) => (
            <li key={i} className="flex items-start justify-between rounded-2xl bg-white px-4 py-3 shadow-[0_10px_30px_-26px_rgba(45,26,20,0.5)]">
              <div className="text-sm" style={{ color: CAFE }}>
                {a.label && <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: TERRA }}>{a.label}</p>}
                {a.recipient && <p className="font-medium">{a.recipient}</p>}
                <p style={{ color: `${CAFE}99` }}>{a.line}, {a.city}{a.department ? `, ${a.department}` : ""}</p>
                {a.phone && <p style={{ color: `${CAFE}80` }}>{a.phone}</p>}
              </div>
              <button onClick={() => persist(list.filter((_, idx) => idx !== i))} className="rounded-full p-2 text-[#2D1A14]/30 transition-colors hover:text-red-500" aria-label="Eliminar"><Trash2 className="h-4 w-4" /></button>
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
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Teléfono" inputMode="tel" className={`${cls} sm:col-span-2`} style={{ borderColor: `${CAFE}15`, color: CAFE }} />
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={saving} className="flex h-12 items-center rounded-2xl px-6 text-sm font-bold disabled:opacity-60" style={{ backgroundColor: CAFE, color: CREMA }}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar dirección"}</button>
            <button type="button" onClick={() => setAdding(false)} className="h-12 rounded-2xl px-5 text-sm font-medium" style={{ color: `${CAFE}99` }}>Cancelar</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setAdding(true)} className="mt-4 inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-black/5" style={{ borderColor: TERRA, color: TERRA }}><Plus className="h-4 w-4" /> Añadir dirección</button>
      )}
    </Panel>
  )
}

function SeccionPagos() {
  return (
    <Panel title="Métodos de pago" desc="Cómo se procesan tus pagos.">
      <div className="flex items-start gap-3 rounded-2xl bg-white p-5 shadow-[0_12px_36px_-28px_rgba(45,26,20,0.5)]">
        <ShieldCheck className="mt-0.5 h-6 w-6 flex-shrink-0" style={{ color: TERRA }} />
        <div className="text-sm" style={{ color: `${CAFE}99` }}>
          <p className="font-medium" style={{ color: CAFE }}>Pagos 100% seguros con Wompi</p>
          <p className="mt-1">Por tu seguridad no guardamos datos de tarjetas. Cada compra se procesa cifrada en la pasarela de Wompi (tarjetas, PSE, Nequi y más).</p>
        </div>
      </div>
    </Panel>
  )
}

function SeccionDeseos() {
  return <Panel title="Lista de deseos" desc="Tus aromas guardados como favoritos."><div className="rounded-2xl border border-dashed py-10 text-center text-sm" style={{ borderColor: `${CAFE}20`, color: `${CAFE}99` }}>Gestiona tus favoritos en <Link href="/favoritos" className="font-semibold" style={{ color: TERRA }}>Lista de deseos →</Link></div></Panel>
}
function SeccionResenas() {
  return <Panel title="Mis reseñas" desc="Las opiniones que has compartido."><div className="rounded-2xl border border-dashed py-10 text-center text-sm" style={{ borderColor: `${CAFE}20`, color: `${CAFE}99` }}>Aún no has escrito reseñas. Cuéntanos qué te parecieron tus aromas desde la ficha de cada producto.</div></Panel>
}

function SeccionNotificaciones() {
  const { user } = useAuth()
  const initial = (user?.user_metadata?.notifs as { ofertas?: boolean; pedidos?: boolean; novedades?: boolean }) || {}
  const [prefs, setPrefs] = useState({ ofertas: initial.ofertas !== false, pedidos: initial.pedidos !== false, novedades: initial.novedades !== false })
  const [saved, setSaved] = useState(false)
  async function toggle(key: keyof typeof prefs) {
    const next = { ...prefs, [key]: !prefs[key] }; setPrefs(next); setSaved(false)
    await getSupabaseBrowser().auth.updateUser({ data: { notifs: next } }); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }
  const rows: { key: keyof typeof prefs; t: string; s: string }[] = [
    { key: "ofertas", t: "Ofertas y descuentos", s: "Promos exclusivas y códigos." },
    { key: "pedidos", t: "Estado de mis pedidos", s: "Avisos de envío y entrega." },
    { key: "novedades", t: "Novedades y lanzamientos", s: "Nuevos aromas y colecciones." },
  ]
  return (
    <Panel title="Notificaciones" desc="Elige qué quieres recibir.">
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-[0_10px_30px_-26px_rgba(45,26,20,0.5)]">
            <div><p className="text-sm font-medium" style={{ color: CAFE }}>{r.t}</p><p className="text-xs" style={{ color: `${CAFE}80` }}>{r.s}</p></div>
            <button onClick={() => toggle(r.key)} aria-label={r.t} className="relative h-6 w-11 flex-shrink-0 rounded-full transition-colors" style={{ backgroundColor: prefs[r.key] ? TERRA : `${CAFE}25` }}>
              <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all" style={{ left: prefs[r.key] ? "calc(100% - 1.375rem)" : "0.125rem" }} />
            </button>
          </div>
        ))}
      </div>
      {saved && <p className="mt-3 flex items-center gap-1 text-sm text-green-600"><CheckCircle className="h-4 w-4" /> Preferencias guardadas</p>}
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
