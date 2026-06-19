"use client"

import { useEffect, useRef } from "react"
import { Leaf, ShieldCheck, Truck, Sparkles } from "lucide-react"

/**
 * Guarantees — reversión de riesgo como cinemática horizontal (ref: buckssauce.com).
 * La sección se fija (sticky) y, al hacer scroll vertical, la "rueda" de beneficios
 * avanza lateralmente uno a uno: número gigante, píldora con el beneficio y copy.
 * Al terminar la rueda, el scroll continúa hacia abajo con normalidad.
 * Fallback estático en móvil y con prefers-reduced-motion.
 */
const ITEMS = [
  {
    icon: Leaf,
    title: "100% Natural",
    text: "Sin parabenos ni aceites grasos. Seguro para tus clientes, tus prendas y tus productos.",
  },
  {
    icon: Sparkles,
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
        el.style.opacity = String(1 - d * 0.55)
        const inner = el.firstElementChild as HTMLElement | null
        if (inner) inner.style.transform = `scale(${(1 - d * 0.07).toFixed(3)})`
      })
      dotRefs.current.forEach((dot, i) => {
        if (dot) dot.style.width = i === active ? "26px" : "8px"
        if (dot) dot.style.opacity = i === active ? "1" : "0.4"
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
        className="relative hidden bg-[#2D1A14] md:block"
        style={{ height: `${N * 100}vh` }}
        aria-label="Por qué comprar en Cliché"
      >
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          {/* línea guía punteada */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-[3.5vw] border-t border-dashed border-[#FAF8F5]/15" />

          {/* eyebrow */}
          <div className="pointer-events-none absolute left-1/2 top-[12%] z-20 -translate-x-1/2 text-center">
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.4em] text-[#A67163]">
              Antes de comprar
            </p>
            <p className="mt-2 font-serif text-sm text-[#FAF8F5]/55">
              <span ref={counterRef}>01</span> — 0{N}
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
                  <div className="relative flex flex-col items-center text-center transition-transform duration-200">
                    <span
                      aria-hidden
                      className="guarantee-num font-serif font-medium leading-none"
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="-mt-[7vw] flex items-center gap-3 rounded-2xl bg-[#FAF8F5] px-8 py-4 shadow-2xl">
                      <Icon className="h-5 w-5 text-[#2D1A14]" strokeWidth={2} />
                      <span className="text-sm font-bold uppercase tracking-[0.22em] text-[#2D1A14]">
                        {item.title}
                      </span>
                    </div>
                    <p className="mt-9 max-w-xl font-serif text-2xl font-medium leading-snug text-[#FAF8F5] lg:text-3xl">
                      {item.text}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* dots de progreso */}
          <div className="absolute bottom-[10%] left-1/2 flex -translate-x-1/2 items-center gap-2">
            {ITEMS.map((_, i) => (
              <span
                key={i}
                ref={(el) => { dotRefs.current[i] = el }}
                className="h-[3px] rounded-full bg-[#A67163] transition-all duration-300"
                style={{ width: i === 0 ? "26px" : "8px", opacity: i === 0 ? 1 : 0.4 }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Fallback estático (móvil / reduced-motion) ── */}
      <section className="bg-[#2D1A14] py-16 md:hidden">
        <p className="mb-10 text-center text-[0.66rem] font-semibold uppercase tracking-[0.4em] text-[#A67163]">
          Antes de comprar
        </p>
        <div className="container mx-auto grid grid-cols-2 gap-x-6 gap-y-10 px-4">
          {ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.title} className="text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#FAF8F5]/25 text-[#A67163]">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#FAF8F5]">
                  {item.title}
                </h3>
                <p className="mx-auto mt-2 max-w-[210px] text-xs leading-relaxed text-[#FAF8F5]/60">
                  {item.text}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      <style jsx>{`
        .guarantee-num {
          font-size: 26vw;
          color: transparent;
          -webkit-text-stroke: 1.5px rgba(250, 248, 245, 0.28);
        }
      `}</style>
    </>
  )
}
