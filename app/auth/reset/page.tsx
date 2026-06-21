"use client"

import { useEffect, useState } from "react"
import { Lock, Loader2, CheckCircle, AlertCircle, ShieldCheck } from "lucide-react"
import { getSupabaseBrowser } from "@/lib/supabase/client"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

const CREMA = "#FAF8F5"
const CAFE = "#2D1A14"
const TERRA = "#A67163"

/**
 * /auth/reset — destino del enlace "restablecer contraseña" de Supabase.
 * El enlace crea una sesión temporal de recuperación; aquí el usuario define su
 * nueva contraseña con updateUser({ password }).
 */
export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false)
  const [checked, setChecked] = useState(false)
  const [pass, setPass] = useState("")
  const [confirm, setConfirm] = useState("")
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  useEffect(() => {
    const supabase = getSupabaseBrowser()
    // El cliente procesa el token del enlace y establece la sesión de recuperación.
    supabase.auth.getSession().then(({ data }: { data: { session: unknown } }) => {
      if (data.session) setReady(true)
      setChecked(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event: string, session: unknown) => {
      if (event === "PASSWORD_RECOVERY" || session) { setReady(true); setChecked(true) }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (pass.length < 6) return setMsg({ type: "err", text: "La contraseña debe tener al menos 6 caracteres." })
    if (pass !== confirm) return setMsg({ type: "err", text: "Las contraseñas no coinciden." })
    setSaving(true)
    const { error } = await getSupabaseBrowser().auth.updateUser({ password: pass })
    setSaving(false)
    if (error) {
      setMsg({ type: "err", text: "No se pudo actualizar. El enlace pudo expirar; solicita uno nuevo." })
    } else {
      setMsg({ type: "ok", text: "¡Contraseña actualizada! Redirigiendo a tu cuenta…" })
      setTimeout(() => window.location.assign("/cuenta"), 1600)
    }
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: CREMA }}>
      <Header />
      <section className="mx-auto max-w-md px-5 pb-24 pt-28 sm:pt-36">
        <div className="overflow-hidden rounded-3xl border bg-white shadow-[0_20px_60px_-30px_rgba(45,26,20,0.35)]" style={{ borderColor: `${CAFE}12` }}>
          <div className="h-1.5 w-full bg-gradient-to-r from-[#A67163] via-[#C4958A] to-[#A67163]" />
          <div className="p-7 sm:p-9">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: `${TERRA}15` }}>
              <ShieldCheck className="h-6 w-6" style={{ color: TERRA }} />
            </span>
            <h1 className="text-center font-serif text-3xl font-medium" style={{ color: CAFE }}>Nueva contraseña</h1>
            <p className="mt-2 text-center text-sm" style={{ color: `${CAFE}99` }}>Elige una contraseña nueva para tu cuenta.</p>

            {msg && (
              <div className="mt-5 flex items-start gap-2 rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: msg.type === "err" ? "#fef2f2" : "#f0fdf4", color: msg.type === "err" ? "#b91c1c" : "#15803d" }}>
                {msg.type === "err" ? <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /> : <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />}
                <span>{msg.text}</span>
              </div>
            )}

            {!checked ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" style={{ color: TERRA }} /></div>
            ) : ready ? (
              <form onSubmit={submit} className="mt-6 space-y-3">
                <div className="flex items-center gap-2 rounded-xl border px-3 focus-within:border-[#A67163]" style={{ borderColor: `${CAFE}20` }}>
                  <Lock className="h-4 w-4" style={{ color: `${CAFE}55` }} />
                  <input type="password" required minLength={6} placeholder="Nueva contraseña (mín. 6)" value={pass} onChange={(e) => setPass(e.target.value)} className="h-12 flex-1 bg-transparent text-sm outline-none" style={{ color: CAFE }} />
                </div>
                <div className="flex items-center gap-2 rounded-xl border px-3 focus-within:border-[#A67163]" style={{ borderColor: `${CAFE}20` }}>
                  <Lock className="h-4 w-4" style={{ color: `${CAFE}55` }} />
                  <input type="password" required placeholder="Confirmar contraseña" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-12 flex-1 bg-transparent text-sm outline-none" style={{ color: CAFE }} />
                </div>
                <button type="submit" disabled={saving} className="flex h-12 w-full items-center justify-center rounded-xl text-sm font-bold tracking-wide transition-opacity disabled:opacity-60" style={{ backgroundColor: TERRA, color: CREMA }}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Actualizar contraseña"}
                </button>
              </form>
            ) : (
              <div className="mt-6 text-center">
                <p className="text-sm" style={{ color: `${CAFE}99` }}>
                  Este enlace no es válido o ya expiró. Vuelve a{" "}
                  <a href="/cuenta" className="font-semibold underline-offset-2 hover:underline" style={{ color: TERRA }}>iniciar sesión</a>{" "}
                  y solicita uno nuevo.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}
