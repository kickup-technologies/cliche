"use client"

import { useState } from "react"

/**
 * EditorialNewsletter — captura de email minimal y centrada (estilo renesme).
 * Línea de input subrayada, sin tarjetas ni ruido visual.
 * Conectada a /api/subscribe (guarda en BD + envía el código por correo).
 */
export function EditorialNewsletter() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || loading) return
    setLoading(true)
    setError(false)
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "b2b" }),
      })
      if (!res.ok) { setError(true); return }
      // Marca persistente: ya está suscrito → el popup de captura no vuelve a salir.
      try { localStorage.setItem("cliche_subscribed", "1") } catch {}
      setSent(true)
    } catch {
      setError(true)
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
          10% off en el primer pedido de tu marca
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
          Suscríbete y recibe tu código de bienvenida, ideas de marketing olfativo
          y los lanzamientos antes que nadie.
        </p>

        {sent ? (
          <p className="mt-8 text-sm font-medium text-primary">
            ¡Listo! Revisa tu correo: tu código de bienvenida va en camino.
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
            {error && (
              <p className="mt-4 text-xs text-red-600">
                No pudimos completar la suscripción. Intenta de nuevo en un momento.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  )
}
