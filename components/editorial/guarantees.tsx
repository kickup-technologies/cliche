"use client"

import { useEffect, useRef } from "react"
import { Leaf, ShieldCheck, Truck, Shirt } from "lucide-react"

/**
 * Guarantees — reversión de riesgo como cinemática horizontal (ref de movimiento:
 * buckssauce.com, pero con la paleta crema de Cliché). La sección se fija (sticky)
 * y, al hacer scroll vertical, la "rueda" de beneficios avanza lateralmente: una
 * tarjeta limpia con ícono + beneficio + copy, y el número de posición debajo.
 * Al terminar la rueda, el scroll continúa hacia abajo.
 * Fallback estático en móvil y con prefers-reduced-motion.
 */
const ITEMS = [
  {
    icon: Leaf,
    title: "100% Natural",
    text: "Sin parabenos ni aceites grasos. Seguro para tus clientes, tus prendas y tus productos.",
  },
  {
    icon: Shirt,
    title: "No mancha",
    text: "Probado en textiles claros y delicados. Cero residuos, cero manchas.",
  },
  {
    icon: Truck,
    title: "Envío nacional",
    text: "Despachamos a toda Colombia. Envío gratis en compras desde $300.000.",
  },
  {
    icon: ShieldCheck,
    title: "Pago protegido",
    text: "Checkout cifrado y pasarela certificada. Compra con total tranquilidad.",
  },
]

const N = ITEMS.length

export function Guarantees() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const panelRefs = useRef<(HTMLDivElement | null)[]>([])
  const dotRefs = useRef<(HTMLSpanElement | null)[]>([])
  const counterRef = useRef<HTMLSpanElement>(null)

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
        const d = Math.min(1, Math.abs(exact - i))
        el.style.opacity = String(1 - d * 0.5)
        const inner = el.firstElementChild as HTMLElement | null
        if (inner) inner.style.transform = `translateY(${(d * 26).toFixed(1)}px) scale(${(1 - d * 0.05).toFixed(3)})`
      })
      dotRefs.current.forEach((dot, i) => {
        if (!dot) return
        dot.style.width = i === active ? "26px" : "8px"
        dot.style.opacity = i === active ? "1" : "0.35"
      })
      if (counterRef.current) counterRef.current.textContent = String(active + 1).padStart(2, "0")

      if (running) raf = requestAnimationFrame(tick)
    }

    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !running) {
          running = true
          raf = requestAnimationFrame(tick)
        } else if (!e.isIntersecting && running) {
          running = false
          cancelAnimationFrame(raf)
        }
      },
      { rootMargin: "40% 0px 40% 0px" }
    )
    io.observe(section)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      io.disconnect()
    }
  }, [])

  return (
    <>
      {/* ── Cinemática horizontal (desktop) ── */}
      <section
        ref={sectionRef}
        className="relative hidden bg-secondary md:block"
        style={{ height: `${N * 100}vh` }}
        aria-label="Por qué comprar en Cliché"
      >
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          {/* eyebrow + contador */}
          <div className="pointer-events-none absolute left-1/2 top-[13%] z-20 -translate-x-1/2 text-center">
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.4em] text-primary">
              Antes de comprar
            </p>
            <p className="mt-2 font-serif text-sm tracking-[0.2em] text-foreground/45">
              <span ref={counterRef}>01</span> / 0{N}
            </p>
          </div>

          {/* track */}
          <div
            ref={trackRef}
            className="flex h-full will-change-transform"
            style={{ width: `${N * 100}vw` }}
          >
            {ITEMS.map((item, i) => {
              const Icon = item.icon
              return (
                <div
                  key={item.title}
                  ref={(el) => { panelRefs.current[i] = el }}
                  className="flex h-full w-screen flex-shrink-0 items-center justify-center px-6"
                >
                  <div className="flex flex-col items-center transition-[transform,opacity] duration-200">
                    {/* Tarjeta limpia */}
                    <div className="flex w-[min(86vw,400px)] flex-col items-center rounded-[2rem] border border-border/70 bg-background px-10 py-11 text-center shadow-[0_34px_80px_-44px_rgba(45,26,20,0.5)]">
                      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                        <Icon className="h-7 w-7" strokeWidth={1.75} />
                      </span>
                      <h3 className="mt-6 font-serif text-2xl font-medium text-foreground">
                        {item.title}
                      </h3>
                      <div className="my-4 h-px w-10 bg-border" />
                      <p className="max-w-[18rem] text-sm leading-relaxed text-muted-foreground">
                        {item.text}
                      </p>
                    </div>

                    {/* Número de posición — debajo de la tarjeta */}
                    <span aria-hidden className="guarantee-num mt-7 font-serif font-medium leading-none">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* dots de progreso */}
          <div className="absolute bottom-[9%] left-1/2 flex -translate-x-1/2 items-center gap-2">
            {ITEMS.map((_, i) => (
              <span
                key={i}
                ref={(el) => { dotRefs.current[i] = el }}
                className="h-[3px] rounded-full bg-primary transition-all duration-300"
                style={{ width: i === 0 ? "26px" : "8px", opacity: i === 0 ? 1 : 0.35 }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Fallback estático (móvil / reduced-motion) ── */}
      <section className="bg-secondary py-16 md:hidden">
        <p className="mb-10 text-center text-[0.66rem] font-semibold uppercase tracking-[0.4em] text-primary">
          Antes de comprar
        </p>
        <div className="container mx-auto grid grid-cols-2 gap-5 px-4">
          {ITEMS.map((item, i) => {
            const Icon = item.icon
            return (
              <div
                key={item.title}
                className="relative flex flex-col items-center rounded-2xl border border-border/70 bg-background px-5 py-7 text-center"
              >
                <span className="absolute right-3 top-2 font-serif text-2xl font-medium text-primary/25">
                  0{i + 1}
                </span>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <h3 className="mt-4 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-foreground">
                  {item.title}
                </h3>
                <p className="mx-auto mt-2 max-w-[200px] text-xs leading-relaxed text-muted-foreground">
                  {item.text}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      <style jsx>{`
        .guarantee-num {
          font-size: clamp(4rem, 9vw, 8rem);
          color: transparent;
          -webkit-text-stroke: 1.5px rgba(166, 113, 99, 0.45);
        }
      `}</style>
    </>
  )
}
