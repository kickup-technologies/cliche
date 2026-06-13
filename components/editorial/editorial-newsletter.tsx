"use client"

import { useState } from "react"

/**
 * EditorialNewsletter — captura de email minimal y centrada (estilo renesme).
 * Línea de input subrayada, sin tarjetas ni ruido visual.
 */
export function EditorialNewsletter() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    // Integración real de newsletter pendiente — por ahora feedback local
    setSent(true)
  }

  return (
    <section className="bg-background py-20 md:py-28">
      <div className="container mx-auto max-w-xl px-4 text-center">
        <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-primary">
          Solo para la comunidad
        </p>
        <h2 className="font-serif text-3xl font-medium text-foreground md:text-4xl">
          10% off en tu primer pedido
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
          Suscríbete y recibe tu código de bienvenida, además de lanzamientos
          y reposiciones antes que nadie.
        </p>

        {sent ? (
          <p className="mt-8 text-sm font-medium text-primary">
            ¡Listo! Revisa tu correo: tu código de bienvenida va en camino.
          </p>
        ) : (
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
              className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-foreground transition-colors hover:text-primary"
            >
              Suscribirse
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
