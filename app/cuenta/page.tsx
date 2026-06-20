"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Mail, Lock, LogOut, Package, MapPin, User as UserIcon, Settings, CheckCircle, AlertCircle, Loader2, Plus, Trash2 } from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useAuth } from "@/context/auth-context"
import { getSupabaseBrowser } from "@/lib/supabase/client"

const CREMA = "#FAF8F5"
const CAFE = "#2D1A14"
const TERRA = "#A67163"
const fmt = (n: number) => `$${(n || 0).toLocaleString("es-CO")}`

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
  if (loading) {
    return <div className="flex justify-center py-40"><Loader2 className="h-6 w-6 animate-spin" style={{ color: TERRA }} /></div>
  }
  if (!user) {
    return (
      <section className="mx-auto max-w-md px-5 pb-24 pt-28 sm:pt-36">
        <AuthForm />
      </section>
    )
  }
  return <AccountLayout email={user.email || ""} signOut={signOut} />
}

/* ─────────────────────────── LOGIN / SIGNUP ─────────────────────────── */
function AuthForm() {
  const params = useSearchParams()
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: "ok" | "err" | "info"; text: string } | null>(null)

  useEffect(() => {
    if (params.get("error")) setMsg({ type: "err", text: "No se pudo verificar el enlace. Intenta de nuevo." })
  }, [params])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setMsg(null)
    const supabase = getSupabaseBrowser()
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
        if (error) throw error
        setMsg({ type: "info", text: "Te enviamos un correo de verificación. Ábrelo para activar tu cuenta." })
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw new Error(/confirm/i.test(error.message) ? "Verifica tu correo antes de iniciar sesión." : "Correo o contraseña incorrectos.")
        window.location.assign("/")
        return
      }
    } catch (err) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : "Ocurrió un error." })
    } finally { setLoading(false) }
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
            {msg.type === "err" ? <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /> : <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />}
            <span>{msg.text}</span>
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-3">
          <Field icon={<Mail className="h-4 w-4" style={{ color: `${CAFE}55` }} />}>
            <input type="email" inputMode="email" required placeholder="Tu correo electrónico" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 flex-1 bg-transparent text-sm outline-none" style={{ color: CAFE }} />
          </Field>
          <Field icon={<Lock className="h-4 w-4" style={{ color: `${CAFE}55` }} />}>
            <input type="password" required minLength={6} placeholder="Contraseña (mín. 6)" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 flex-1 bg-transparent text-sm outline-none" style={{ color: CAFE }} />
          </Field>
          <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center rounded-xl text-sm font-bold tracking-wide transition-opacity disabled:opacity-60" style={{ backgroundColor: TERRA, color: CREMA }}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs" style={{ color: `${CAFE}99` }}>
          {mode === "login" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMsg(null) }} className="font-semibold underline-offset-2 hover:underline" style={{ color: TERRA }}>
            {mode === "login" ? "Créala aquí" : "Inicia sesión"}
          </button>
        </p>
      </div>
    </div>
  )
}

function Field({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="flex items-center gap-2 rounded-xl border px-3 transition-colors focus-within:border-[#A67163]" style={{ borderColor: `${CAFE}20` }}>{icon}{children}</div>
}

/* ─────────────────────────── CUENTA (SIDEBAR) ─────────────────────────── */
const NAV = [
  { id: "pedidos", label: "Mis pedidos", icon: Package },
  { id: "datos", label: "Mis datos", icon: UserIcon },
  { id: "direcciones", label: "Direcciones", icon: MapPin },
  { id: "config", label: "Configuración", icon: Settings },
] as const

function AccountLayout({ email, signOut }: { email: string; signOut: () => Promise<void> }) {
  const params = useSearchParams()
  const seccion = (params.get("seccion") || "pedidos") as (typeof NAV)[number]["id"]

  return (
    <section className="mx-auto max-w-5xl px-5 pb-24 pt-28 sm:pt-32">
      <p className="text-[11px] font-semibold uppercase tracking-[0.3em]" style={{ color: TERRA }}>Resumen de tu cuenta</p>
      <h1 className="mt-1 font-serif text-3xl font-medium" style={{ color: CAFE }}>Hola, {email.split("@")[0]}</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
        {/* Sidebar */}
        <aside className="h-fit rounded-2xl border bg-white p-3" style={{ borderColor: `${CAFE}12` }}>
          <nav className="flex flex-col gap-1">
            {NAV.map(({ id, label, icon: Icon }) => {
              const active = seccion === id
              return (
                <Link key={id} href={`/cuenta?seccion=${id}`}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors"
                  style={{ backgroundColor: active ? TERRA : "transparent", color: active ? CREMA : CAFE }}>
                  <Icon className="h-4 w-4" /> {label}
                </Link>
              )
            })}
            <button onClick={() => signOut()} className="mt-1 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50">
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </button>
          </nav>
        </aside>

        {/* Contenido */}
        <div className="min-w-0">
          {seccion === "pedidos" && <SeccionPedidos />}
          {seccion === "datos" && <SeccionDatos email={email} />}
          {seccion === "direcciones" && <SeccionDirecciones />}
          {seccion === "config" && <SeccionConfig />}
        </div>
      </div>
    </section>
  )
}

function Panel({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white p-6 sm:p-8" style={{ borderColor: `${CAFE}12` }}>
      <h2 className="font-serif text-2xl font-medium" style={{ color: CAFE }}>{title}</h2>
      {desc && <p className="mt-1 text-sm" style={{ color: `${CAFE}99` }}>{desc}</p>}
      <div className="mt-6">{children}</div>
    </div>
  )
}

type Order = { id: string; created_at: string; status: string; total: number }
function SeccionPedidos() {
  const [orders, setOrders] = useState<Order[] | null>(null)
  useEffect(() => {
    getSupabaseBrowser().from("orders").select("id, created_at, status, total").order("created_at", { ascending: false })
      .then(({ data }: { data: Order[] | null }) => setOrders(data ?? []))
  }, [])
  return (
    <Panel title="Mis pedidos" desc="El historial de tus compras.">
      {orders === null ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" style={{ color: TERRA }} /></div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-dashed py-10 text-center text-sm" style={{ borderColor: `${CAFE}20`, color: `${CAFE}99` }}>
          Aún no tienes pedidos.{" "}<Link href="/catalogo" className="font-semibold" style={{ color: TERRA }}>Explorar aromas →</Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => (
            <li key={o.id} className="flex items-center justify-between rounded-xl border px-4 py-3" style={{ borderColor: `${CAFE}12` }}>
              <div>
                <p className="text-sm font-medium" style={{ color: CAFE }}>{new Date(o.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}</p>
                <p className="text-xs capitalize" style={{ color: `${CAFE}80` }}>{o.status}</p>
              </div>
              <p className="text-sm font-semibold" style={{ color: CAFE }}>{fmt(o.total)}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function SeccionDatos({ email }: { email: string }) {
  const { user } = useAuth()
  const [name, setName] = useState((user?.user_metadata?.full_name as string) || "")
  const [phone, setPhone] = useState((user?.user_metadata?.phone as string) || "")
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState(false)
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setOk(false)
    await getSupabaseBrowser().auth.updateUser({ data: { full_name: name.trim(), phone: phone.trim() } })
    setSaving(false); setOk(true); setTimeout(() => setOk(false), 2500)
  }
  return (
    <Panel title="Mis datos" desc="Actualiza tu información personal.">
      <form onSubmit={save} className="space-y-4">
        <Labeled label="Nombre completo"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" className="h-11 w-full rounded-xl border bg-transparent px-3 text-sm outline-none focus:border-[#A67163]" style={{ borderColor: `${CAFE}20`, color: CAFE }} /></Labeled>
        <Labeled label="Teléfono"><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="Tu teléfono" className="h-11 w-full rounded-xl border bg-transparent px-3 text-sm outline-none focus:border-[#A67163]" style={{ borderColor: `${CAFE}20`, color: CAFE }} /></Labeled>
        <Labeled label="Correo electrónico"><input value={email} disabled className="h-11 w-full rounded-xl border bg-black/[0.03] px-3 text-sm outline-none" style={{ borderColor: `${CAFE}15`, color: `${CAFE}80` }} /></Labeled>
        <div className="flex items-center gap-3 pt-1">
          <button type="submit" disabled={saving} className="flex h-11 items-center justify-center rounded-xl px-6 text-sm font-bold disabled:opacity-60" style={{ backgroundColor: CAFE, color: CREMA }}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar cambios"}</button>
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

  async function persist(next: Address[]) {
    setSaving(true)
    await getSupabaseBrowser().auth.updateUser({ data: { addresses: next } })
    setList(next); setSaving(false)
  }
  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!form.line || !form.city) return
    await persist([...list, form])
    setForm({ label: "", recipient: "", line: "", city: "", department: "", phone: "" }); setAdding(false)
  }
  async function remove(i: number) { await persist(list.filter((_, idx) => idx !== i)) }

  const inputCls = "h-11 w-full rounded-xl border bg-transparent px-3 text-sm outline-none focus:border-[#A67163]"
  return (
    <Panel title="Direcciones" desc="Tus direcciones de envío guardadas.">
      {list.length === 0 && !adding && (
        <div className="rounded-xl border border-dashed py-10 text-center text-sm" style={{ borderColor: `${CAFE}20`, color: `${CAFE}99` }}>Aún no tienes direcciones guardadas.</div>
      )}
      {list.length > 0 && (
        <ul className="space-y-2">
          {list.map((a, i) => (
            <li key={i} className="flex items-start justify-between rounded-xl border px-4 py-3" style={{ borderColor: `${CAFE}12` }}>
              <div className="text-sm" style={{ color: CAFE }}>
                {a.label && <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: TERRA }}>{a.label}</p>}
                {a.recipient && <p className="font-medium">{a.recipient}</p>}
                <p style={{ color: `${CAFE}99` }}>{a.line}, {a.city}{a.department ? `, ${a.department}` : ""}</p>
                {a.phone && <p style={{ color: `${CAFE}80` }}>{a.phone}</p>}
              </div>
              <button onClick={() => remove(i)} className="rounded-full p-2 text-[#2D1A14]/30 transition-colors hover:text-red-500" aria-label="Eliminar"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <form onSubmit={add} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Etiqueta (Casa, Oficina)" className={inputCls} style={{ borderColor: `${CAFE}20`, color: CAFE }} />
          <input value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} placeholder="Quién recibe" className={inputCls} style={{ borderColor: `${CAFE}20`, color: CAFE }} />
          <input value={form.line} onChange={(e) => setForm({ ...form, line: e.target.value })} placeholder="Dirección" required className={`${inputCls} sm:col-span-2`} style={{ borderColor: `${CAFE}20`, color: CAFE }} />
          <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Ciudad" required className={inputCls} style={{ borderColor: `${CAFE}20`, color: CAFE }} />
          <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Departamento" className={inputCls} style={{ borderColor: `${CAFE}20`, color: CAFE }} />
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Teléfono" inputMode="tel" className={`${inputCls} sm:col-span-2`} style={{ borderColor: `${CAFE}20`, color: CAFE }} />
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={saving} className="flex h-11 items-center rounded-xl px-6 text-sm font-bold disabled:opacity-60" style={{ backgroundColor: CAFE, color: CREMA }}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar dirección"}</button>
            <button type="button" onClick={() => setAdding(false)} className="h-11 rounded-xl px-5 text-sm font-medium" style={{ color: `${CAFE}99` }}>Cancelar</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setAdding(true)} className="mt-4 inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-black/5" style={{ borderColor: TERRA, color: TERRA }}><Plus className="h-4 w-4" /> Añadir dirección</button>
      )}
    </Panel>
  )
}

function SeccionConfig() {
  const [pass, setPass] = useState("")
  const [confirm, setConfirm] = useState("")
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)
  async function changePass(e: React.FormEvent) {
    e.preventDefault(); setMsg(null)
    if (pass.length < 6) return setMsg({ type: "err", text: "La contraseña debe tener al menos 6 caracteres." })
    if (pass !== confirm) return setMsg({ type: "err", text: "Las contraseñas no coinciden." })
    setSaving(true)
    const { error } = await getSupabaseBrowser().auth.updateUser({ password: pass })
    setSaving(false)
    if (error) setMsg({ type: "err", text: "No se pudo cambiar la contraseña." })
    else { setMsg({ type: "ok", text: "Contraseña actualizada." }); setPass(""); setConfirm("") }
  }
  const inputCls = "h-11 w-full rounded-xl border bg-transparent px-3 text-sm outline-none focus:border-[#A67163]"
  return (
    <Panel title="Configuración" desc="Cambia tu contraseña.">
      {msg && <div className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: msg.type === "err" ? "#fef2f2" : "#f0fdf4", color: msg.type === "err" ? "#b91c1c" : "#15803d" }}>{msg.text}</div>}
      <form onSubmit={changePass} className="max-w-sm space-y-3">
        <Labeled label="Nueva contraseña"><input type="password" value={pass} onChange={(e) => setPass(e.target.value)} minLength={6} required placeholder="Mín. 6 caracteres" className={inputCls} style={{ borderColor: `${CAFE}20`, color: CAFE }} /></Labeled>
        <Labeled label="Confirmar contraseña"><input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required placeholder="Repite la contraseña" className={inputCls} style={{ borderColor: `${CAFE}20`, color: CAFE }} /></Labeled>
        <button type="submit" disabled={saving} className="flex h-11 items-center rounded-xl px-6 text-sm font-bold disabled:opacity-60" style={{ backgroundColor: CAFE, color: CREMA }}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Actualizar contraseña"}</button>
      </form>
    </Panel>
  )
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: `${CAFE}70` }}>{label}</label>{children}</div>
}
