"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { BRANDS } from "@/components/editorial/brand-logos"

/**
 * Movimiento de la landing /empresas (solo presentación, sin librerías):
 * - MotionRoot: revelado al hacer scroll (un único IntersectionObserver para
 *   todos los [data-reveal]) y parallax suave en los [data-parallax].
 * - CountUp: contador animado para las cifras ya publicadas.
 * - SegmentIndex: índice editorial "Para quién" con imagen fija que cambia.
 *
 * Todo el contenido se renderiza visible en el servidor: el estado oculto
 * solo existe si JS cargó (clase .emp-js) y nunca para lo que ya está en
 * pantalla al hidratar. Con prefers-reduced-motion no se anima nada.
 */

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

// ── Revelado + parallax ──────────────────────────────────────────────────────

export function MotionRoot() {
  useIsoLayoutEffect(() => {
    const root = document.querySelector<HTMLElement>("main.emp")
    if (!root || reducedMotion()) return

    const vh = window.innerHeight
    const els = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"))
    // Lo que ya está a la vista al hidratar NO se esconde (sin parpadeo ni CLS).
    for (const el of els) {
      const r = el.getBoundingClientRect()
      if (r.top < vh * 0.94 && r.bottom > 0) el.classList.add("is-in")
    }
    root.classList.add("emp-js")

    // Las máscaras (clip-path cerrado) y los filetes (scaleX 0) no tienen área
    // visible y el observador no los vería: se observa su contenedor.
    const byTarget = new Map<Element, HTMLElement[]>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          for (const el of byTarget.get(e.target) || []) el.classList.add("is-in")
          byTarget.delete(e.target)
          io.unobserve(e.target)
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0 },
    )
    for (const el of els) {
      if (el.classList.contains("is-in")) continue
      const kind = el.dataset.reveal
      const target = (kind === "mask" || kind === "line") && el.parentElement ? el.parentElement : el
      const list = byTarget.get(target)
      if (list) list.push(el)
      else {
        byTarget.set(target, [el])
        io.observe(target)
      }
    }

    // Parallax: el hijo [data-parallax] se desplaza dentro de su contenedor
    // (que tiene overflow oculto y le sobra alto). Valor = fracción del alto.
    const layers = Array.from(root.querySelectorAll<HTMLElement>("[data-parallax]"))
    let raf = 0
    const update = () => {
      raf = 0
      const h = window.innerHeight
      for (const el of layers) {
        const host = el.parentElement
        if (!host) continue
        const r = host.getBoundingClientRect()
        if (r.bottom < -80 || r.top > h + 80) continue
        const p = (r.top + r.height / 2 - h / 2) / (h / 2 + r.height / 2) // 1 abajo → -1 arriba
        const amt = Number.parseFloat(el.dataset.parallax || "") || 0.05
        el.style.transform = `translate3d(0, ${(-p * amt * r.height).toFixed(1)}px, 0)`
      }
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    if (layers.length) {
      window.addEventListener("scroll", onScroll, { passive: true })
      window.addEventListener("resize", onScroll, { passive: true })
      update()
    }

    return () => {
      io.disconnect()
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      if (raf) cancelAnimationFrame(raf)
      root.classList.remove("emp-js")
    }
  }, [])
  return null
}

// ── Contador ─────────────────────────────────────────────────────────────────

/** Cifra que cuenta desde 0 al entrar en pantalla. El servidor pinta el valor
 *  final (sin JS y para buscadores); el ancho queda reservado en `ch`. */
export function CountUp({ value, prefix = "", suffix = "", duration = 1400 }: {
  value: number
  prefix?: string
  suffix?: string
  duration?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [n, setN] = useState(value)

  useEffect(() => {
    const el = ref.current
    if (!el || reducedMotion() || value <= 1) return
    let raf = 0
    let started = false
    const run = () => {
      started = true
      const t0 = performance.now()
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / duration)
        const eased = 1 - Math.pow(1 - k, 4)
        setN(Math.round(eased * value))
        if (k < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting && !started) {
          io.disconnect()
          setN(0)
          run()
        }
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [value, duration])

  return (
    <span ref={ref} className="inline-block tabular-nums" style={{ minWidth: `${String(value).length}ch` }}>
      {prefix}
      {n}
      {suffix}
    </span>
  )
}

// ── Logos en marquesina ──────────────────────────────────────────────────────

/** Tira editorial de los logos ya publicados en el inicio (misma lista que
 *  components/editorial/brand-logos.tsx). Se pausa al pasar el cursor. */
export function BrandStrip({ label }: { label: string }) {
  return (
    <section aria-label={label} className="border-y border-[var(--emp-line)] py-9 md:py-11">
      <div className="mx-auto grid max-w-[1320px] items-center gap-7 px-5 md:grid-cols-[220px_minmax(0,1fr)] md:gap-10 md:px-10">
        <p className="emp-eyebrow emp-kicker">{label}</p>
        <div className="emp-marquee" style={{ ["--emp-dur" as string]: "46s" }}>
          {[0, 1].map((copy) => (
            <ul key={copy} aria-hidden={copy === 1 || undefined} className="emp-marquee-track gap-14 pr-14 md:gap-20 md:pr-20">
              {BRANDS.map((b) => (
                <li key={b.src} className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.src} alt={copy === 1 ? "" : b.alt} loading="lazy" className="emp-logo" />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Índice "Para quién" ──────────────────────────────────────────────────────

export interface SegmentItem {
  title: string
  text: string
  img: string
  alt: string
  aromas: { slug: string; name: string; image_url: string | null }[]
}

export function SegmentIndex({ items }: { items: SegmentItem[] }) {
  const [active, setActive] = useState(0)
  const rows = useRef<(HTMLLIElement | null)[]>([])

  // En pantallas sin hover (o al hacer scroll) manda la fila centrada.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.idx))
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    )
    rows.current.forEach((r) => r && io.observe(r))
    return () => io.disconnect()
  }, [])

  return (
    <div className="grid gap-10 md:grid-cols-12 md:gap-12 lg:gap-16">
      {/* Imagen fija (escritorio) que cambia con la fila activa */}
      <div className="hidden md:col-span-5 md:block">
        <div className="sticky top-28">
          <div data-reveal="mask" className="emp-frame relative aspect-[4/5] w-full overflow-hidden">
            {items.map((it, i) => (
              <Image
                key={it.img}
                src={it.img}
                alt={i === active ? it.alt : ""}
                aria-hidden={i !== active}
                fill
                sizes="(max-width: 768px) 0px, 40vw"
                className={cn(
                  "object-cover transition-[opacity,scale] duration-[600ms] ease-[cubic-bezier(.22,1,.36,1)]",
                  i === active ? "scale-100 opacity-100" : "scale-[1.04] opacity-0",
                )}
              />
            ))}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#2D1A14]/55 to-transparent" />
            <p aria-hidden className="absolute bottom-5 left-5 right-5 flex items-baseline gap-3 text-[#FAF8F5]">
              <span className="font-serif text-[15px] italic">{String(active + 1).padStart(2, "0")}</span>
              <span className="emp-eyebrow text-[#FAF8F5]/85">{items[active]?.title}</span>
            </p>
          </div>
        </div>
      </div>

      <ol className="border-t border-[var(--emp-line)] md:col-span-7">
        {items.map((it, i) => (
          <li
            key={it.title}
            ref={(el) => { rows.current[i] = el }}
            data-idx={i}
            data-active={i === active || undefined}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            className="emp-seg group border-b border-[var(--emp-line)]"
          >
            {/* Imagen por fila solo en móvil */}
            <div data-reveal="mask" className="emp-frame relative mt-8 aspect-[16/11] w-full overflow-hidden md:hidden">
              <Image src={it.img} alt={it.alt} fill sizes="100vw" className="object-cover" />
            </div>
            <div data-reveal className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-4 py-7 md:grid-cols-[3rem_minmax(0,1fr)] md:gap-x-6 md:py-9">
              <span aria-hidden className="pt-2 font-serif text-[15px] italic text-[var(--emp-terra-d)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex min-w-0 flex-col gap-3">
                <h3 className="emp-seg-title font-serif text-[clamp(24px,2.6vw,34px)] leading-[1.08] tracking-[-0.01em] text-[var(--emp-ink)]">
                  {it.title}
                </h3>
                <p className="max-w-[52ch] text-[15.5px] leading-relaxed text-[var(--emp-ink-2)]">{it.text}</p>
                {it.aromas.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {it.aromas.map((a) => (
                      <Link key={a.slug} href={`/productos/${a.slug}`} className="emp-chip">
                        {a.image_url && (
                          <Image src={a.image_url} alt="" width={26} height={26} className="h-[26px] w-[26px] rounded-full object-cover" />
                        )}
                        {a.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
