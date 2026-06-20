"use client"

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Mail, Lock, LogOut, Package, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useAuth } from "@/context/auth-context"
import { getSupabaseBrowser } from "@/lib/supabase/client"

const CREMA = "#FAF8F5"
const CAFE = "#2D1A14"
const TERRA = "#A67163"
const fmt = (n: number) => `$${(n || 0).toLocaleString("es-CO")}`

type Order = { id: string; created_at: string; status: string; total: number }

export default function CuentaPage() {
  const { user, loading, signOut } = useAuth()

  return (
    <main className="min-h-screen" style={{ backgroundColor: CREMA }}>
      <Header />
      <section className="mx-auto flex max-w-md flex-col px-5 pb-24 pt-28 sm:pt-36">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" style={{ color: TERRA }} /></div>
        ) : user ? (
          <AccountView email={user.email || ""} onSignOut={signOut} />
        ) : (
          <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" style={{ color: TERRA }} /></div>}>
            <AuthForm />
          </Suspense>
        )}
      </section>
      <Footer />
    </main>
  )
}

function AuthForm() {
  const params = useSearchParams()
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: "ok" | "err" | "info"; text: string } | null>(null)

  useEffect(() => {
    if (params.get("verificado")) setMsg({ type: "ok", text: "¡Cuenta verificada! Ya puedes iniciar sesión." })
    else if (params.get("error")) setMsg({ type: "err", text: "No se pudo verificar el enlace. Intenta de nuevo." })
  }, [params])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    const supabase = getSupabaseBrowser()
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        })
        if (error) throw error
        setMsg({ type: "info", text: "Te enviamos un correo de verificación. Ábrelo para activar tu cuenta." })
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) {
          if (/confirm/i.test(error.message)) throw new Error("Verifica tu correo antes de iniciar sesión.")
          throw new Error("Correo o contraseña incorrectos.")
        }
        // onAuthStateChange (contexto) actualiza la vista automáticamente.
      }
    } catch (err) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : "Ocurrió un error. Intenta de nuevo." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-3xl border bg-white p-7 shadow-sm sm:p-9" style={{ borderColor: `${CAFE}12` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/logo-cliche.png" alt="Cliché" className="mx-auto mb-5 h-9 w-auto object-contain" />
      <h1 className="text-center font-serif text-3xl font-medium" style={{ color: CAFE }}>
        {mode === "login" ? "Bienvenida de vuelta" : "Crea tu cuenta"}
      </h1>
      <p className="mt-2 text-center text-sm" style={{ color: `${CAFE}99` }}>
        {mode === "login" ? "Accede a tus pedidos y tu carrito guardado." : "Guarda tu carrito y sigue tus pedidos."}
      </p>

      {msg && (
        <div
          className="mt-5 flex items-start gap-2 rounded-xl px-4 py-3 text-sm"
          style={{
            backgroundColor: msg.type === "err" ? "#fef2f2" : msg.type === "ok" ? "#f0fdf4" : `${TERRA}12`,
            color: msg.type === "err" ? "#b91c1c" : msg.type === "ok" ? "#15803d" : CAFE,
          }}
        >
          {msg.type === "err" ? <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /> : <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-3">
        <div className="flex items-center gap-2 rounded-xl border px-3" style={{ borderColor: `${CAFE}20` }}>
          <Mail className="h-4 w-4" style={{ color: `${CAFE}55` }} />
          <input
            type="email" inputMode="email" required placeholder="Tu correo electrónico"
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="h-12 flex-1 bg-transparent text-sm outline-none" style={{ color: CAFE }}
          />
        </div>
        <div className="flex items-center gap-2 rounded-xl border px-3" style={{ borderColor: `${CAFE}20` }}>
          <Lock className="h-4 w-4" style={{ color: `${CAFE}55` }} />
          <input
            type="password" required minLength={6} placeholder="Contraseña (mín. 6)"
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="h-12 flex-1 bg-transparent text-sm outline-none" style={{ color: CAFE }}
          />
        </div>
        <button
          type="submit" disabled={loading}
          className="flex h-12 w-full items-center justify-center rounded-xl text-sm font-bold tracking-wide transition-opacity disabled:opacity-60"
          style={{ backgroundColor: TERRA, color: CREMA }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
        </button>
      </form>

      <p className="mt-5 text-center text-xs" style={{ color: `${CAFE}99` }}>
        {mode === "login" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
        <button
          onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMsg(null) }}
          className="font-semibold underline-offset-2 hover:underline" style={{ color: TERRA }}
        >
          {mode === "login" ? "Créala aquí" : "Inicia sesión"}
        </button>
      </p>
    </div>
  )
}

function AccountView({ email, onSignOut }: { email: string; onSignOut: () => Promise<void> }) {
  const [orders, setOrders] = useState<Order[] | null>(null)

  useEffect(() => {
    // RLS garantiza que solo se devuelven los pedidos de ESTE usuario.
    getSupabaseBrowser()
      .from("orders")
      .select("id, created_at, status, total")
      .order("created_at", { ascending: false })
      .then(({ data }: { data: Order[] | null }) => setOrders(data ?? []))
  }, [])

  return (
    <div>
      <div className="rounded-3xl border bg-white p-7 shadow-sm" style={{ borderColor: `${CAFE}12` }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: TERRA }}>Mi cuenta</p>
        <h1 className="mt-2 font-serif text-2xl font-medium" style={{ color: CAFE }}>{email}</h1>
        <button
          onClick={onSignOut}
          className="mt-5 inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-black/5"
          style={{ borderColor: `${CAFE}20`, color: CAFE }}
        >
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 font-serif text-xl" style={{ color: CAFE }}>
          <Package className="h-5 w-5" style={{ color: TERRA }} /> Mis pedidos
        </h2>
        {orders === null ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" style={{ color: TERRA }} /></div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-center text-sm" style={{ borderColor: `${CAFE}12`, color: `${CAFE}99` }}>
            Aún no tienes pedidos. <Link href="/catalogo" className="font-semibold" style={{ color: TERRA }}>Explorar aromas →</Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between rounded-2xl border bg-white px-4 py-3" style={{ borderColor: `${CAFE}12` }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: CAFE }}>{new Date(o.created_at).toLocaleDateString("es-CO")}</p>
                  <p className="text-xs capitalize" style={{ color: `${CAFE}80` }}>{o.status}</p>
                </div>
                <p className="text-sm font-semibold" style={{ color: CAFE }}>{fmt(o.total)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
