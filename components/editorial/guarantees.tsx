"use client"

import { useEffect, useRef } from "react"

/**
 * Guarantees — reversión de riesgo como CINEMÁTICA EDITORIAL de lujo.
 * Sin tarjetas, sin íconos: tipografía gigante como pieza gráfica, número
 * colosal integrado al fondo, grid asimétrico, detalles de medición y
 * microtipografía. La sección se fija y, al hacer scroll, la composición
 * avanza lateralmente por cada garantía con parallax sutil. Al terminar,
 * el scroll continúa. Fallback editorial apilado en móvil / reduced-motion.
 */
const ITEMS = [
  { n: "01", kicker: "Fórmula", line1: "100%", line2: "Natural", text: "Sin parabenos ni aceites grasos. Una fórmula segura para tus clientes, tus prendas y tus productos." },
  { n: "02", kicker: "Textiles", line1: "No", line2: "mancha", text: "Probada en textiles claros y delicados. Cero residuos, cero manchas, cero preocupaciones." },
  { n: "03", kicker: "Logística", line1: "Envío", line2: "nacional", text: "Despachamos a toda Colombia. Envío de cortesía en compras desde $300.000." },
  { n: "04", kicker: "Seguridad", line1: "Pago", line2: "protegido", text: "Checkout cifrado y pasarela certificada. Compra con total tranquilidad." },
]

const N = ITEMS.length

export function Guarantees() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const panelRefs = useRef<(HTMLDivElement | null)[]>([])
  const counterRef = useRef<HTMLSpanElement>(null)
  const progressRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const track = trackRef.current
    if (!section || !track) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let raf = 0
    let running = false

    const tick = () => {
      const rect = section.getBoundingClientRect()
      const vh = window.innerHeight
      const dist = Math.max(1, rect.height - vh)
      const p = Math.min(1, Math.max(0, -rect.top / dist))

      track.style.transform = `translate3d(${(-p * (N - 1) * 100).toFixed(3)}vw, 0, 0)`

      const exact = p * (N - 1)
      const active = Math.round(exact)

      panelRefs.current.forEach((el, i) => {
        if (!el) return
        const rel = exact - i            // distancia firmada al centro
        const d = Math.min(1, Math.abs(rel))
        el.style.opacity = String(1 - d * 0.55)
        // Parallax de profundidad (sutil): número de fondo y texto a ritmos distintos
        const num = el.querySelector<HTMLElement>("[data-giant]")
        const txt = el.querySelector<HTMLElement>("[data-text]")
        if (num) num.style.transform = `translate3d(${(rel * -34).toFixed(1)}px, ${(d * 10).toFixed(1)}px, 0)`
        if (txt) txt.style.transform = `translate3d(${(rel * 12).toFixed(1)}px, 0, 0)`
      })

      if (counterRef.current) counterRef.current.textContent = String(active + 1).padStart(2, "0")
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${(p).toFixed(3)})`

      if (running) raf = requestAnimationFrame(tick)
    }

    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !running) { running = true; raf = requestAnimationFrame(tick) }
        else if (!e.isIntersecting && running) { running = false; cancelAnimationFrame(raf) }
      },
      { rootMargin: "40% 0px 40% 0px" }
    )
    io.observe(section)
    return () => { running = false; cancelAnimationFrame(raf); io.disconnect() }
  }, [])

  return (
    <>
      {/* ───────────── Cinemática editorial (desktop) ───────────── */}
      <section
        ref={sectionRef}
        className="relative hidden md:block"
        style={{ height: `${N * 100}vh` }}
        aria-label="Garantías Cliché"
      >
        <div className="sticky top-0 h-screen overflow-hidden bg-gradient-to-br from-[#FAF8F5] via-[#F3EAE1] to-[#ECE0D4]">
          {/* textura orgánica casi imperceptible */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-multiply" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

          {/* masthead fijo */}
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-[7vw] pt-10">
            <span className="text-[0.62rem] font-semibold uppercase tracking-[0.42em] text-[#2D1A14]/55">
              Antes de comprar
            </span>
            <span className="font-serif text-sm tracking-[0.25em] text-[#2D1A14]/40">
              <span ref={counterRef}>01</span> <span className="mx-1 text-[#A67163]">/</span> 0{N}
            </span>
          </div>
          <div className="absolute inset-x-[7vw] top-[4.2rem] z-20 h-px bg-[#2D1A14]/12" />

          {/* marcas de medición (regla) — borde izquierdo */}
          <div className="pointer-events-none absolute left-[7vw] top-1/2 z-10 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
            {Array.from({ length: 9 }).map((_, i) => (
              <span key={i} className="block bg-[#2D1A14]/20" style={{ width: i % 2 === 0 ? "18px" : "9px", height: "1px" }} />
            ))}
          </div>

          {/* microtipografía vertical — borde derecho */}
          <span className="pointer-events-none absolute right-[2.4vw] top-1/2 z-10 origin-center -translate-y-1/2 rotate-90 text-[0.58rem] font-medium uppercase tracking-[0.5em] text-[#2D1A14]/30">
            Bienestar · Cliché
          </span>

          {/* track */}
          <div ref={trackRef} className="flex h-full will-change-transform" style={{ width: `${N * 100}vw` }}>
            {ITEMS.map((item, i) => (
              <div
                key={item.n}
                ref={(el) => { panelRefs.current[i] = el }}
                className="relative h-full w-screen flex-shrink-0"
              >
                {/* Número colosal integrado al fondo (parcialmente cortado) */}
                <span
                  data-giant
                  aria-hidden
                  className="pointer-events-none absolute -right-[4vw] top-1/2 z-0 -translate-y-1/2 select-none font-serif font-medium leading-none text-[#2D1A14]/[0.06]"
                  style={{ fontSize: "64vh" }}
                >
                  {item.n}
                </span>

                {/* Composición editorial (grid asimétrico) */}
                <div className="relative z-10 grid h-full grid-cols-12 items-center px-[7vw]">
                  <div data-text className="col-span-12 lg:col-span-7">
                    {/* Fig. + kicker */}
                    <div className="mb-7 flex items-center gap-4">
                      <span className="h-px w-14 bg-[#A67163]" />
                      <span className="text-[0.62rem] font-semibold uppercase tracking-[0.34em] text-[#A67163]">
                        Fig. {item.n} — {item.kicker}
                      </span>
                    </div>

                    {/* Mensaje protagonista */}
                    <h2 className="guarantee-title font-serif font-medium text-[#2D1A14]">
                      <span className="block">{item.line1}</span>
                      <span className="block italic text-[#2D1A14]/85">{item.line2}</span>
                    </h2>

                    {/* Descripción */}
                    <p className="mt-9 max-w-md text-base font-light leading-relaxed text-[#2D1A14]/65 md:text-lg">
                      {item.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* progreso numérico + línea fina */}
          <div className="absolute bottom-10 left-[7vw] right-[7vw] z-20 flex items-center gap-5">
            <span className="font-serif text-xs tracking-[0.2em] text-[#2D1A14]/45">01</span>
            <span className="relative h-px flex-1 overflow-hidden bg-[#2D1A14]/12">
              <span ref={progressRef} className="absolute inset-0 origin-left bg-[#A67163]" style={{ transform: "scaleX(0)" }} />
            </span>
            <span className="font-serif text-xs tracking-[0.2em] text-[#2D1A14]/45">0{N}</span>
          </div>
        </div>
      </section>

      {/* ───────────── Fallback editorial apilado (móvil / reduced-motion) ───────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#FAF8F5] to-[#ECE0D4] py-16 md:hidden">
        <div className="px-7">
          <div className="flex items-center justify-between">
            <span className="text-[0.6rem] font-semibold uppercase tracking-[0.4em] text-[#2D1A14]/55">Antes de comprar</span>
            <span className="font-serif text-xs tracking-[0.2em] text-[#2D1A14]/40">0{N}</span>
          </div>
          <div className="mt-3 h-px bg-[#2D1A14]/12" />

          {ITEMS.map((item) => (
            <article key={item.n} className="relative border-b border-[#2D1A14]/10 py-12">
              <span aria-hidden className="pointer-events-none absolute -right-2 top-4 select-none font-serif font-medium leading-none text-[#2D1A14]/[0.06]" style={{ fontSize: "34vw" }}>
                {item.n}
              </span>
              <div className="relative z-10">
                <div className="mb-4 flex items-center gap-3">
                  <span className="h-px w-9 bg-[#A67163]" />
                  <span className="text-[0.58rem] font-semibold uppercase tracking-[0.3em] text-[#A67163]">Fig. {item.n} — {item.kicker}</span>
                </div>
                <h2 className="font-serif text-5xl font-medium leading-[0.95] text-[#2D1A14]">
                  <span className="block">{item.line1}</span>
                  <span className="block italic text-[#2D1A14]/85">{item.line2}</span>
                </h2>
                <p className="mt-5 max-w-xs text-sm font-light leading-relaxed text-[#2D1A14]/65">{item.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <style jsx>{`
        .guarantee-title {
          font-size: clamp(3.4rem, 8.5vw, 8.5rem);
          line-height: 0.92;
          letter-spacing: -0.015em;
        }
      `}</style>
    </>
  )
}
