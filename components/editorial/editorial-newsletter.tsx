"use client"

import { useState } from "react"
import Link from "next/link"
import { X, LogIn, UserPlus } from "lucide-react"
import { useAuth } from "@/context/auth-context"

/**
 * EditorialNewsletter — captura de email minimal y centrada (estilo renesme).
 * Reglas: (1) suscribirse requiere sesión iniciada → si no hay sesión, se abre
 * un popup para iniciar sesión o crear cuenta; (2) si el correo YA está
 * suscrito, no se envía nada y se avisa.
 */
export function EditorialNewsletter() {
  const { user } = useAuth()
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: "err" | "info"; text: string } | null>(null)
  const [authPrompt, setAuthPrompt] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || loading) return
    // Sin sesión → popup para iniciar sesión / crear cuenta (no se suscribe).
    if (!user) { setAuthPrompt(true); return }

    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "b2b" }),
      })
      const data = await res.json().catch(() => ({}))
      if (data?.alreadySubscribed) {
        setMsg({ type: "info", text: "Este correo ya está suscrito 🌿" })
        return
      }
      if (!res.ok || !data?.success) {
        setMsg({ type: "err", text: "No pudimos completar la suscripción. Intenta de nuevo en un momento." })
        return
      }
      try { localStorage.setItem("cliche_subscribed", "1") } catch {}
      setSent(true)
    } catch {
      setMsg({ type: "err", text: "No pudimos completar la suscripción. Intenta de nuevo en un momento." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="bg-background py-20 md:py-28">
      <div className="container mx-auto max-w-xl px-4 text-center">
        <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary">
          Para marcas y negocios
        </p>
        <h2 className="font-serif text-3xl font-medium text-foreground md:text-4xl">
          El aroma que tu marca merece
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
          Suscríbete y recibe ideas de marketing olfativo, novedades de la casa
          y los lanzamientos antes que nadie.
        </p>

        {sent ? (
          <p className="mt-8 text-sm font-medium text-primary">
            ¡Listo! Ya haces parte de Cliché. Nos vemos en tu correo.
          </p>
        ) : (
          <>
            <form
              onSubmit={handleSubmit}
              className="mx-auto mt-8 flex max-w-md items-center gap-3 border-b border-foreground/30 pb-2"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Tu correo electrónico"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-foreground transition-colors hover:text-primary disabled:opacity-50"
              >
                {loading ? "Enviando…" : "Suscribirse"}
              </button>
            </form>
            {msg && (
              <p className={`mt-4 text-xs ${msg.type === "err" ? "text-red-600" : "text-primary"}`}>
                {msg.text}
              </p>
            )}
          </>
        )}
      </div>

      {/* Popup: requiere sesión para suscribirse */}
      {authPrompt && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4" role="dialog" aria-modal="true">
          <button
            aria-label="Cerrar"
            onClick={() => setAuthPrompt(false)}
            className="absolute inset-0 bg-[#2D1A14]/45 backdrop-blur-sm duration-200 animate-in fade-in"
          />
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-black/5 bg-white p-8 text-center shadow-[0_30px_80px_-20px_rgba(45,26,20,0.4)] duration-200 animate-in fade-in zoom-in-95">
            <button
              onClick={() => setAuthPrompt(false)}
              aria-label="Cerrar"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-[#2D1A14]/40 transition-colors hover:bg-black/5 hover:text-[#2D1A14]"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#A67163]">Un paso más</p>
            <h3 className="mt-2 font-serif text-2xl font-medium text-[#2D1A14]">Crea tu cuenta para suscribirte</h3>
            <p className="mt-3 text-sm leading-relaxed text-[#2D1A14]/60">
              La suscripción queda ligada a tu cuenta. Inicia sesión o crea una en segundos.
            </p>
            <div className="mt-7 flex flex-col gap-3">
              <Link
                href="/cuenta?modo=registro"
                className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#2D1A14] text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <UserPlus className="h-4 w-4" /> Crear cuenta
              </Link>
              <Link
                href="/cuenta"
                className="flex h-12 items-center justify-center gap-2 rounded-full border border-[#2D1A14]/20 text-sm font-medium text-[#2D1A14] transition-colors hover:bg-[#FAF8F5]"
              >
                <LogIn className="h-4 w-4" /> Ya tengo cuenta
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
