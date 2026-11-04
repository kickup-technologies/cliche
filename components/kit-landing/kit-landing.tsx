"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight, BadgePercent, Check, Droplets, Gift, MessageCircle, Minus, Plus,
  ShoppingBag, Shuffle, Star, Truck,
} from "lucide-react"
import { useCart, type PackComponent } from "@/context/cart-context"
import { useCAPI } from "@/lib/use-capi"
import { PRICE_TIERS, SHIPPING_COST, TIER_BY_ID, UNIT_PRICE, tierSavings } from "@/lib/pricing"
import { SEGMENTS } from "@/lib/segments"
import { BrandLogos } from "@/components/editorial/brand-logos"
import { WhatsAppButton } from "@/components/whatsapp-button"
import { CHRISTMAS_COMBO, USAGE_TIPS, type KitAroma, type KitReview } from "@/lib/kit-landing-content"
import { useKitMotion } from "./use-kit-motion"
import "./kit-landing.css"

/**
 * Landing "Arma tu kit" (estructura de la maqueta de la agencia, datos reales).
 * El kit se agrega con `addPack` (dispara AddToCart) y el pago va por el
 * `checkout()` del carrito (dispara InitiateCheckout con content_ids del
 * catálogo) → /checkout → Mercado Pago. Mismo flujo que el PackBuilder.
 *
 * Capa visual: estilos y animaciones propios en ./kit-landing.css (todo bajo
 * `.kit-root`) y revelado/parallax en ./use-kit-motion.ts.
 */

const KIT_TIERS = PRICE_TIERS.filter((t) => t.units > 1)
const DEFAULT_TIER = KIT_TIERS[0]
const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`
const perBottle = (t: { price: number; units: number }) => Math.round(t.price / t.units)
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
/** Retardo escalonado para el revelado (`--kr-d`). */
const delay = (ms: number) => ({ "--kr-d": `${ms}ms` }) as CSSProperties
/** Retardo para la entrada CSS del héroe (`--kit-d`). */
const heroDelay = (ms: number) => ({ "--kit-d": `${ms}ms` }) as CSSProperties

/** "A, B y C" (o "A, B o C" con conj = "o") */
function joinNames(names: string[], conj = "y"): string {
  if (names.length <= 1) return names.join("")
  return `${names.slice(0, -1).join(", ")} ${conj} ${names[names.length - 1]}`
}

/** Rótulo de paso: "Paso 1" en serif itálica + "Tamaño" en versalitas, con filete. */
function StepLabel({ n, label, className = "" }: { n: number; label: string; className?: string }) {
  return (
    <p className={`kit-step ${className}`}>
      <span className="font-serif text-lg italic text-primary sm:text-xl">Paso {n}</span>
      <span aria-hidden className="h-px w-5 bg-primary/40" />
      <span className="kit-caps text-foreground/80">{label}</span>
    </p>
  )
}

interface Props {
  aromas: KitAroma[]
  reviews: KitReview[]
  freeShippingThreshold: number
  whatsappNumber: string
  christmasAromaId: string | null
  christmasAromaName: string | null
}

export function KitLanding({
  aromas,
  reviews,
  freeShippingThreshold,
  whatsappNumber,
  christmasAromaId,
  christmasAromaName,
}: Props) {
  const { addPack, openDrawer, checkout, items } = useCart()
  const { track } = useCAPI()

  const [tierId, setTierId] = useState(DEFAULT_TIER.id)
  const [picks, setPicks] = useState<string[]>([])
  const [filter, setFilter] = useState("todos")
  const [toast, setToast] = useState<string | null>(null)
  const [trayOn, setTrayOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [goPay, setGoPay] = useState(false)
  const [added, setAdded] = useState(false)
  const rootRef = useRef<HTMLElement>(null)
  const armarRef = useRef<HTMLElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const viewSent = useRef(false)
  /** Dirección del último cambio por aroma (solo para animar el contador). */
  const dirRef = useRef<Record<string, 1 | -1>>({})

  useKitMotion(rootRef)

  const tier = TIER_BY_ID[tierId] ?? DEFAULT_TIER
  const byId = useMemo(() => new Map(aromas.map((a) => [a.id, a])), [aromas])
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const id of picks) m.set(id, (m.get(id) ?? 0) + 1)
    return m
  }, [picks])
  const missing = tier.units - picks.length
  const complete = missing === 0
  const maxSavingsTier = KIT_TIERS[KIT_TIERS.length - 1]

  const segments = useMemo(
    () => SEGMENTS.filter((s) => aromas.some((a) => a.segments.includes(s.key))),
    [aromas],
  )
  const visible = useMemo(
    () => (filter === "todos" ? aromas : aromas.filter((a) => a.segments.includes(filter))),
    [aromas, filter],
  )
  const bestSellers = useMemo(() => aromas.filter((a) => a.bestSeller), [aromas])
  const christmasCombo = useMemo(() => {
    if (!christmasAromaId) return []
    const bySlug = new Map(aromas.map((a) => [a.slug.replace(/^aroma-/, ""), a.id]))
    return CHRISTMAS_COMBO.map((s) => bySlug.get(s)).filter((id): id is string => !!id)
  }, [aromas, christmasAromaId])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3200)
  }, [])
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    if (addedTimer.current) clearTimeout(addedTimer.current)
  }, [])

  // ── ViewContent al cargar (navegador + servidor, mismo event_id) ──
  useEffect(() => {
    if (viewSent.current) return
    viewSent.current = true
    track({
      event_name: "ViewContent",
      custom_data: {
        content_ids: aromas.map((a) => a.id),
        content_name: "Kit personalizado",
        content_type: "product_group",
        currency: "COP",
        value: DEFAULT_TIER.price,
      },
    })
  }, [aromas, track])

  // ── Selección ──
  const addPick = useCallback((id: string) => {
    const a = byId.get(id)
    if (!a) return
    if (picks.length >= tier.units) {
      showToast(`Tu kit x${tier.units} ya está completo. Quita un aroma o elige un kit más grande.`)
      return
    }
    if ((counts.get(id) ?? 0) >= a.stock) {
      showToast(`No hay más unidades disponibles de ${a.name}.`)
      return
    }
    setPicks((prev) => [...prev, id])
  }, [byId, counts, picks.length, showToast, tier.units])

  const removePick = useCallback((id: string) => {
    setPicks((prev) => {
      const i = prev.lastIndexOf(id)
      if (i < 0) return prev
      const next = prev.slice()
      next.splice(i, 1)
      return next
    })
  }, [])

  const fillWith = useCallback((ids: string[]) => {
    const next: string[] = []
    for (const id of ids) {
      if (next.length >= tier.units) break
      if (byId.has(id)) next.push(id)
    }
    if (!next.length) return
    setPicks(next)
    const falta = tier.units - next.length
    const names = joinNames(next.map((id) => byId.get(id)!.name))
    showToast(
      `Tu kit ahora tiene ${names}.` +
        (falta > 0 ? ` Te ${plural(falta, "falta 1 aroma", `faltan ${falta} aromas`)}.` : ""),
    )
  }, [byId, showToast, tier.units])

  const selectTier = (id: string) => {
    const t = TIER_BY_ID[id]
    if (!t) return
    setTierId(id)
    if (picks.length > t.units) {
      setPicks((prev) => prev.slice(0, t.units))
      showToast(`Ajustamos tu selección al kit x${t.units}.`)
    }
  }

  // ── Agregar al carrito / pagar ──
  const buildComponents = (): PackComponent[] => {
    const out: PackComponent[] = []
    for (const [id, quantity] of counts) {
      const a = byId.get(id)
      if (a) out.push({ product_id: id, quantity, name: a.fullName, image_url: a.image })
    }
    return out
  }

  const handleAdd = (pay: boolean) => {
    if (!complete || busy) return
    setBusy(true)
    // addPack dispara AddToCart (no se duplica aquí).
    addPack(tier, buildComponents())
    setPicks([])
    if (pay) {
      setGoPay(true)
    } else {
      setBusy(false)
      openDrawer()
      showToast("Kit agregado al carrito.")
      // Solo visual: el botón confirma con un check unos segundos.
      setAdded(true)
      if (addedTimer.current) clearTimeout(addedTimer.current)
      addedTimer.current = setTimeout(() => setAdded(false), 2200)
    }
  }

  // El checkout del contexto lee `items`: se llama cuando el kit recién
  // agregado ya está en el carrito (siguiente render). Dispara InitiateCheckout.
  useEffect(() => {
    if (!goPay) return
    setGoPay(false)
    try {
      sessionStorage.setItem("checkout-back-url", window.location.pathname + window.location.search)
    } catch { /* modo privado */ }
    checkout()
  }, [goPay, checkout, items])

  // ── Barra de resumen: visible al llegar al armador o con aromas elegidos ──
  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const top = armarRef.current?.getBoundingClientRect().top ?? Infinity
      setTrayOn(picks.length > 0 || top < window.innerHeight * 0.85)
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [picks.length])

  const hint = complete
    ? "¡Kit completo!"
    : picks.length
      ? `Llevas ${picks.length} de ${tier.units} · elige ${missing} más`
      : `Elige ${tier.units} aromas`

  const waHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hola, quiero un aroma propio para mi marca")}`

  const benefits = [
    {
      Icon: Shuffle,
      t: "Tú eliges la mezcla",
      d: "Combina aromas distintos o repite tu favorito: el precio del kit no cambia.",
    },
    {
      Icon: BadgePercent,
      t: `Ahorras hasta ${fmt(tierSavings(maxSavingsTier))}`,
      d: `Con el ${maxSavingsTier.label.toLowerCase()} pagas ${fmt(perBottle(maxSavingsTier))} por frasco en vez de ${fmt(UNIT_PRICE)}.`,
    },
    {
      Icon: Droplets,
      t: "No mancha",
      d: "La fórmula no contiene aceites grasos ni colorantes: úsala en prendas, telas, empaques y espacios.",
    },
    {
      Icon: Truck,
      t: "Envío a todo Colombia",
      d: `Gratis en compras desde ${fmt(freeShippingThreshold)}. Entrega estimada de 7 a 9 días hábiles.`,
    },
  ]

  const shortcutBtn = `kit-press rounded-full border border-primary/35 bg-card px-3.5 py-1.5 text-[13px] text-accent hover:border-primary hover:bg-secondary ${focusRing}`

  return (
    <>
      <main
        ref={rootRef}
        className="kit-root min-h-screen overflow-x-clip bg-background pb-44 pt-24 text-foreground sm:pb-32 sm:pt-28"
      >
        {/* ── Navidad (solo si el Aroma Navidad está activo) ── */}
        {christmasAromaId && (
          <div className="container mx-auto px-4">
            <div className="kr flex flex-col gap-3 rounded-2xl border border-[var(--kit-line)] bg-secondary/70 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="flex items-start gap-3">
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-primary/30 bg-card text-primary">
                  <Gift className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="pt-1">
                  <strong className="font-semibold">Edición especial de Navidad:</strong> el Aroma{" "}
                  {christmasAromaName} ya está disponible para tu kit.
                </span>
              </p>
              <button
                type="button"
                onClick={() => addPick(christmasAromaId)}
                className={`kit-press self-start rounded-full border border-foreground/25 bg-card px-4 py-1.5 text-xs font-semibold hover:border-foreground sm:self-auto ${focusRing}`}
              >
                Sumarlo a mi kit
              </button>
            </div>
          </div>
        )}

        {/* ── Héroe ── */}
        <section aria-labelledby="t-hero" className="container mx-auto px-4 pb-16 pt-6 sm:pb-20 lg:pb-24 lg:pt-10">
          <div className="grid gap-7 lg:grid-cols-[1.08fr_1fr] lg:grid-rows-[auto_1fr] lg:gap-x-16 lg:gap-y-8">
            {/* Titular */}
            <div className="min-w-0 lg:col-start-2 lg:row-start-1 lg:self-end">
              <p className="kit-rise flex items-center gap-3 text-primary" style={heroDelay(0)}>
                <span aria-hidden className="kit-line-grow h-px w-8 bg-primary" />
                <span className="kit-caps">Kits de aromas · Cliché Colombia</span>
              </p>
              <h1
                id="t-hero"
                className="kit-rise mt-5 font-serif text-[2.95rem] leading-[0.98] tracking-[-0.01em] text-balance sm:text-[4.25rem] lg:text-[4rem] xl:text-[4.6rem]"
                style={heroDelay(90)}
              >
                Arma tu kit con los aromas que <em className="italic text-primary">tú eliges</em>
              </h1>
            </div>

            {/* Imagen (LCP: prioridad, visible sin JS, sin máscara inicial) */}
            <figure className="relative lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-center">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-secondary shadow-[var(--kit-shadow-lg)]">
                <div data-kit-parallax className="absolute inset-0 will-change-transform">
                  <Image
                    src="/images/category-kits-marca.png"
                    alt="Caja de regalo con tres sprays de 250 ml: Aire, Agua y Sello de Dios"
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 55vw"
                    className="kit-hero-img object-cover"
                    // Encuadre en los frascos (la tapa de la caja trae texto ajeno a Cliché).
                    style={{ objectPosition: "50% 68%" }}
                  />
                </div>
                <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#2D1A14]/45 via-transparent to-transparent" />
                <figcaption className="kit-rise absolute bottom-4 left-4 right-4 flex items-center gap-3 text-[#FAF8F5] sm:bottom-6 sm:left-6" style={heroDelay(500)}>
                  <span aria-hidden className="h-px w-6 bg-[#FAF8F5]/70" />
                  <span className="kit-caps text-[9.5px] tracking-[0.18em] sm:text-[11px] sm:tracking-[0.28em]">Sprays de 250 ml · Hechos en Colombia</span>
                </figcaption>
              </div>
            </figure>

            {/* Cuerpo: propuesta, precio, beneficios, CTA */}
            <div className="flex min-w-0 flex-col gap-7 lg:col-start-2 lg:row-start-2">
              <p className="kit-rise max-w-[52ch] text-base leading-relaxed text-muted-foreground sm:text-lg" style={heroDelay(180)}>
                Combina {joinNames(KIT_TIERS.map((t) => String(t.units)), "o")} aromas para tu marca, tu tienda,
                tu casa o tu ropa. Sprays de 250 ml de alta concentración, hechos en Colombia.
              </p>

              <div className="kit-rise border-y border-[var(--kit-line)] py-5" style={heroDelay(260)}>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                  <span className="kit-num text-[2.5rem] font-medium leading-none sm:text-5xl">{fmt(DEFAULT_TIER.price)}</span>
                  <span className="rounded-full border border-primary/30 px-3 py-1 text-[13px] text-accent">
                    {DEFAULT_TIER.label} · <span className="kit-num">{fmt(perBottle(DEFAULT_TIER))}</span> por frasco
                  </span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Por separado, {DEFAULT_TIER.units} aromas cuestan {fmt(DEFAULT_TIER.units * UNIT_PRICE)}: ahorras{" "}
                  <strong className="kit-num font-semibold text-foreground">{fmt(tierSavings(DEFAULT_TIER))}</strong>.
                </p>
              </div>

              <ul className="kit-rise grid gap-3 text-[15px] leading-snug" style={heroDelay(340)}>
                {[
                  "Mezcla los aromas que quieras al mismo precio del kit",
                  "Pago seguro en línea con Mercado Pago: tarjetas, PSE y billeteras digitales",
                  `Envío a todo Colombia, gratis en compras desde ${fmt(freeShippingThreshold)}`,
                  "Alta concentración, no mancha y sin parabenos",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <span className="mt-px flex h-5 w-5 flex-none items-center justify-center rounded-full border border-primary/40 text-primary">
                      <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>

              <div className="kit-rise" style={heroDelay(420)}>
                <a
                  href="#armar"
                  className={`kit-press kit-sheen group inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-foreground px-9 py-4 text-sm font-semibold tracking-wide text-background shadow-[var(--kit-shadow-md)] hover:shadow-[var(--kit-shadow-lg)] sm:w-auto ${focusRing}`}
                >
                  Armar mi kit <ArrowRight className="kit-arrow h-4 w-4" aria-hidden />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── Beneficios ── */}
        <section aria-label="Beneficios del kit" className="container mx-auto px-4 pb-16 sm:pb-20">
          <ul className="grid border-t border-[var(--kit-line)] sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map(({ Icon, t, d }, i) => (
              <li
                key={t}
                className={`kr flex gap-4 border-b border-[var(--kit-line)] py-6 sm:flex-col sm:gap-0 sm:px-6 sm:py-8 lg:border-b-0 ${
                  i % 2 === 1 ? "sm:border-l" : ""
                } ${i > 0 ? "lg:border-l" : ""} lg:first:pl-0`}
                style={delay(i * 90)}
              >
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-primary/30 text-primary">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
                </span>
                <div className="min-w-0 sm:mt-5">
                  <span aria-hidden className="kit-caps text-[10px] text-primary/80">0{i + 1}</span>
                  <p className="mt-1 font-serif text-[1.45rem] leading-[1.15]">{t}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{d}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <BrandLogos />

        {/* ── Armador ── */}
        <section
          id="armar"
          ref={armarRef}
          aria-labelledby="t-armar"
          className="container mx-auto scroll-mt-24 px-4 py-16 sm:py-24"
        >
          <div className="kr max-w-2xl">
            <p className="kit-caps text-primary">Tu selección</p>
            <h2 id="t-armar" className="mt-3 font-serif text-[2.9rem] leading-[0.98] tracking-[-0.01em] sm:text-[4.25rem]">
              Arma <em className="italic text-primary">tu kit</em>
            </h2>
          </div>

          {/* Paso 1 */}
          <StepLabel n={1} label="Tamaño" className="kr mt-10 sm:mt-14" />
          <div role="group" aria-label="Tamaño del kit" className="mt-7 grid grid-cols-3 gap-2.5 sm:gap-5 lg:gap-6">
            {KIT_TIERS.map((t, i) => {
              const active = t.id === tier.id
              return (
                <div key={t.id} className="kr" style={delay(i * 80)}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => selectTier(t.id)}
                    className={`kit-tier relative flex h-full w-full flex-col items-center rounded-[1.25rem] border px-1.5 pb-4 pt-6 text-center sm:items-start sm:px-6 sm:pb-6 sm:pt-8 sm:text-left ${focusRing} ${
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-[var(--kit-line)] bg-card text-foreground"
                    }`}
                  >
                    {t.badge && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-primary-foreground shadow-[var(--kit-shadow-sm)] sm:left-6 sm:translate-x-0 sm:text-[10px]">
                        {t.badge}
                      </span>
                    )}
                    <span
                      aria-hidden
                      className="kit-tier-check absolute right-3 top-3 hidden h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground sm:flex"
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </span>
                    <span className={`kit-caps text-[9.5px] sm:text-[10.5px] ${active ? "text-background/70" : "text-muted-foreground"}`}>
                      {t.label}
                    </span>
                    <span className="mt-1.5 flex items-baseline gap-1.5 sm:mt-3">
                      <span className="font-serif text-[2.9rem] leading-[0.85] sm:text-[4.25rem]">{t.units}</span>
                      <span className={`hidden font-serif text-lg italic sm:inline ${active ? "text-background/70" : "text-muted-foreground"}`}>
                        aromas
                      </span>
                    </span>
                    <span aria-hidden className={`my-3 h-px w-full sm:my-5 ${active ? "bg-background/20" : "bg-[var(--kit-line)]"}`} />
                    <span className="kit-num text-[15px] font-semibold leading-tight sm:text-xl">{fmt(t.price)}</span>
                    <span className={`mt-0.5 text-[11px] sm:text-xs ${active ? "text-background/75" : "text-accent"}`}>
                      <span className="kit-num">{fmt(perBottle(t))}</span> c/u
                    </span>
                    <span className={`text-[10.5px] sm:text-xs ${active ? "text-background/55" : "text-muted-foreground"}`}>
                      <span className="sr-only">Precio por separado: </span>
                      <s className="kit-num">{fmt(t.units * UNIT_PRICE)}</s>
                    </span>
                    <span className={`kit-num mt-2 text-[10.5px] font-semibold sm:text-xs ${active ? "text-[#E8C9B8]" : "text-primary"}`}>
                      Ahorras {fmt(tierSavings(t))}
                    </span>
                  </button>
                </div>
              )
            })}
          </div>

          {/* Paso 2 */}
          <StepLabel n={2} label="¿Para qué lo quieres?" className="kr mt-14 sm:mt-16" />
          <div
            role="group"
            aria-label="Filtrar aromas por uso"
            className="kit-noscroll kr -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 [mask-image:linear-gradient(to_right,#000_88%,transparent)] sm:mx-0 sm:flex-wrap sm:px-0 sm:[mask-image:none]"
          >
            {[{ key: "todos", label: "Todos" }, ...segments].map((s) => (
              <button
                key={s.key}
                type="button"
                aria-pressed={filter === s.key}
                onClick={() => setFilter(s.key)}
                className={`kit-press flex-none rounded-full border px-4 py-2 text-sm ${focusRing} ${
                  filter === s.key
                    ? "border-foreground bg-foreground text-background shadow-[var(--kit-shadow-sm)]"
                    : "border-[var(--kit-line-strong)] bg-card hover:border-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="kr mt-5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="kit-caps mr-1 text-[10px]">Atajos</span>
            {bestSellers.length > 0 && (
              <button type="button" onClick={() => fillWith(bestSellers.map((a) => a.id))} className={shortcutBtn}>
                Los más vendidos
              </button>
            )}
            {filter !== "todos" && visible.length > 0 && (
              <button type="button" onClick={() => fillWith(visible.map((a) => a.id))} className={`kit-fade ${shortcutBtn}`}>
                Sugerencia para {segments.find((s) => s.key === filter)?.label.toLowerCase()}
              </button>
            )}
            {christmasCombo.length > 0 && (
              <button type="button" onClick={() => fillWith(christmasCombo)} className={shortcutBtn}>
                Sugerencia de Navidad
              </button>
            )}
            {picks.length > 0 && (
              <button
                type="button"
                onClick={() => setPicks([])}
                className={`kit-fade link-underline rounded px-1 text-accent ${focusRing}`}
              >
                Vaciar kit
              </button>
            )}
          </div>

          {/* Paso 3 */}
          <div className="kr mt-14 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 sm:mt-16">
            <StepLabel n={3} label="Elige tus aromas" className="min-w-[16rem] flex-1" />
            <span className="text-sm text-muted-foreground">
              <span className="kit-num font-semibold text-foreground">{picks.length}</span> de {tier.units} elegidos · puedes repetir
            </span>
          </div>

          {visible.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">No hay aromas disponibles en este filtro.</p>
          ) : (
            <ul className="mt-7 grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 lg:gap-6">
              {visible.map((a, i) => {
                const n = counts.get(a.id) ?? 0
                const canAddMore = picks.length < tier.units && n < a.stock
                const d = (i % 4) * 70
                return (
                  <li key={a.id} className="kr" style={delay(d)}>
                    <div
                      data-on={n > 0 ? "" : undefined}
                      className="kit-card kit-aroma group flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-[var(--kit-line)] bg-card"
                    >
                      <div className="km relative aspect-[4/5] overflow-hidden bg-secondary" style={delay(d + 90)}>
                        <div className="km-img absolute inset-0">
                          <div className="kit-zoom absolute inset-0">
                            <Image
                              src={a.image}
                              alt={`Spray de aroma ${a.name}`}
                              fill
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px"
                              className="object-cover"
                            />
                          </div>
                        </div>
                        <div
                          aria-hidden
                          className={`pointer-events-none absolute inset-0 bg-gradient-to-t from-[#2D1A14]/25 to-transparent transition-opacity duration-500 ${
                            n > 0 ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                          }`}
                        />
                        {a.badge && (
                          <span className="absolute left-2.5 top-2.5 rounded-full bg-card/90 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-foreground shadow-[var(--kit-shadow-sm)] backdrop-blur sm:left-3 sm:top-3 sm:text-[9.5px]">
                            {a.badge}
                          </span>
                        )}
                        {n > 0 && (
                          <span
                            aria-hidden
                            className="kit-pop absolute right-2.5 top-2.5 flex h-8 min-w-8 items-center justify-center overflow-hidden rounded-full bg-foreground px-2 kit-num text-sm font-semibold text-background shadow-[var(--kit-shadow-md)] sm:right-3 sm:top-3"
                          >
                            <span key={n} className="kit-tick" style={{ "--kit-dir": dirRef.current[a.id] ?? 1 } as CSSProperties}>
                              {n}
                            </span>
                          </span>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-5">
                        <h3 className="font-serif text-[1.35rem] leading-[1.05] sm:text-[1.65rem]">{a.name}</h3>
                        {a.notes.length > 0 && (
                          <p className="font-serif text-[14.5px] italic leading-snug text-foreground/75 sm:text-[15.5px]">
                            <span className="sr-only">Notas: </span>
                            {a.notes.join(" · ")}
                          </p>
                        )}
                        {a.idealFor && (
                          <p className="text-[11px] leading-snug text-muted-foreground sm:text-xs">Ideal para: {a.idealFor}</p>
                        )}
                        {a.family && (
                          <span className="mt-1 self-start rounded-full border border-[var(--kit-line)] px-2.5 py-0.5 text-[10.5px] text-accent">
                            Familia: {a.family}
                          </span>
                        )}
                        <div className="mt-auto pt-3">
                          {n === 0 ? (
                            <button
                              type="button"
                              onClick={() => { dirRef.current[a.id] = 1; addPick(a.id) }}
                              aria-label={`Agregar ${a.name} al kit`}
                              className={`kit-press flex h-11 w-full items-center justify-center gap-1.5 rounded-full border border-foreground text-sm font-semibold hover:bg-foreground hover:text-background ${focusRing}`}
                            >
                              <Plus className="h-3.5 w-3.5" aria-hidden /> Agregar
                            </button>
                          ) : (
                            <div className="kit-fade flex h-11 items-center justify-between rounded-full bg-foreground text-background shadow-[var(--kit-shadow-sm)]">
                              <button
                                type="button"
                                onClick={() => { dirRef.current[a.id] = -1; removePick(a.id) }}
                                aria-label={`Quitar un ${a.name}`}
                                className={`kit-press flex h-11 w-10 items-center justify-center rounded-full hover:bg-background/10 sm:w-11 ${focusRing}`}
                              >
                                <Minus className="h-4 w-4" aria-hidden />
                              </button>
                              <span className="flex items-baseline gap-1 overflow-hidden whitespace-nowrap">
                                <span
                                  key={n}
                                  className="kit-tick kit-num text-sm font-semibold"
                                  style={{ "--kit-dir": dirRef.current[a.id] ?? 1 } as CSSProperties}
                                >
                                  {n}
                                </span>
                                <span className="text-[11px] text-background/75 sm:text-xs">en tu kit</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => { dirRef.current[a.id] = 1; addPick(a.id) }}
                                disabled={!canAddMore}
                                aria-label={`Agregar otro ${a.name}`}
                                className={`kit-press flex h-11 w-10 items-center justify-center rounded-full hover:bg-background/10 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent sm:w-11 ${focusRing}`}
                              >
                                <Plus className="h-4 w-4" aria-hidden />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* ── Cómo se usa (mismo texto que la ficha de producto) ── */}
        <section aria-labelledby="t-uso" className="border-t border-[var(--kit-line)]">
          <div className="container mx-auto grid items-center gap-10 px-4 py-16 sm:py-24 md:grid-cols-2 md:gap-16">
            <div className="km relative aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-secondary shadow-[var(--kit-shadow-md)] md:aspect-[4/5]">
              <div className="km-img absolute inset-0">
                <Image
                  src="/images/category-ropa.png"
                  alt="Spray Eternamente Índigo sobre un mostrador de una tienda de ropa"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="kr">
                <p className="kit-caps text-primary">Cómo se usa</p>
                <h2 id="t-uso" className="mt-3 font-serif text-[2.6rem] leading-[1] sm:text-[3.4rem]">
                  Unos puf y el espacio <em className="italic text-primary">cambia</em>
                </h2>
              </div>
              <dl className="mt-8 border-t border-[var(--kit-line)]">
                {USAGE_TIPS.map((u, i) => (
                  <div
                    key={u.title}
                    className="kr grid grid-cols-[2.25rem_1fr] gap-x-3 border-b border-[var(--kit-line)] py-5"
                    style={delay(i * 80)}
                  >
                    <span aria-hidden className="pt-1 font-serif text-base italic text-primary">0{i + 1}</span>
                    <div>
                      <dt className="font-serif text-[1.45rem] leading-tight">{u.title}</dt>
                      <dd className="mt-1 text-muted-foreground">{u.desc}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* ── Reseñas reales aprobadas (tabla `reviews`) ── */}
        {reviews.length > 0 && (
          <section aria-labelledby="t-resenas" className="border-t border-[var(--kit-line)] bg-secondary/40">
            <div className="container mx-auto px-4 py-16 sm:py-24">
              <div className="kr">
                <p className="kit-caps text-primary">Reseñas de clientes</p>
                <h2 id="t-resenas" className="mt-3 font-serif text-[2.6rem] leading-[1] sm:text-[3.4rem]">
                  Lo que dicen quienes <em className="italic text-primary">ya lo usan</em>
                </h2>
              </div>
              <ul className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
                {reviews.map((r, i) => (
                  <li key={r.id} className="kr" style={delay((i % 3) * 90)}>
                    <figure className="kit-card relative flex h-full flex-col gap-4 rounded-[1.25rem] border border-[var(--kit-line)] bg-card p-6 sm:p-7">
                      <span aria-hidden className="absolute right-6 top-3 font-serif text-7xl leading-none text-primary/15">“</span>
                      <p className="flex gap-0.5 text-primary" aria-label={`${r.rating} de 5 estrellas`}>
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Star key={j} className={`h-3.5 w-3.5 ${j < r.rating ? "fill-current" : "opacity-25"}`} aria-hidden />
                        ))}
                      </p>
                      <blockquote className="whitespace-pre-line font-serif text-[1.3rem] leading-[1.3]">“{r.comment}”</blockquote>
                      <figcaption className="mt-auto flex items-center gap-3 border-t border-[var(--kit-line)] pt-4 text-sm text-muted-foreground">
                        <span className="text-foreground">{r.name}</span>
                        {r.aroma && <span className="kit-caps text-[10px] text-accent">{r.aroma}</span>}
                      </figcaption>
                    </figure>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* ── B2B: aroma exclusivo ── */}
        <section aria-labelledby="t-propio" className="container mx-auto px-4 py-16 sm:py-24">
          <div className="kr grid overflow-hidden rounded-[1.75rem] bg-foreground text-background shadow-[var(--kit-shadow-lg)] md:grid-cols-2">
            <div className="km group relative aspect-[4/3] overflow-hidden md:aspect-auto md:min-h-[440px]">
              <div className="km-img absolute inset-0">
                <div className="kit-zoom absolute inset-0 group-hover:scale-[1.04]">
                  <Image
                    src="/images/category-hoteles.png"
                    alt="Spray de aroma Aire en la recepción de un hotel"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-center gap-5 px-6 py-10 sm:px-12 sm:py-14">
              <p className="kit-caps flex items-center gap-3 text-[#E8C9B8]">
                <span aria-hidden className="h-px w-6 bg-[#E8C9B8]/70" />
                Para marcas, hoteles y spas
              </p>
              <h2 id="t-propio" className="font-serif text-[2.45rem] leading-[1] text-white sm:text-[3.4rem]">
                ¿Quieres un aroma <em className="italic text-[#E8C9B8]">exclusivo</em> para tu marca?
              </h2>
              <p className="max-w-[46ch] leading-relaxed text-background/75">
                Diseñamos identidades olfativas a la medida para marcas, tiendas, hoteles y spas. Cuéntanos sobre tu
                marca y lo coordinamos con el equipo.
              </p>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className={`kit-press kit-sheen group mt-2 inline-flex items-center justify-center gap-2 self-start rounded-full bg-background px-7 py-4 text-sm font-semibold text-foreground hover:bg-white focus-visible:ring-offset-foreground ${focusRing}`}
              >
                <MessageCircle className="h-4 w-4" aria-hidden /> Cotizar mi aroma por WhatsApp
                <ArrowRight className="kit-arrow h-4 w-4" aria-hidden />
              </a>
            </div>
          </div>
        </section>

        {/* ── Preguntas frecuentes ── */}
        <section aria-labelledby="t-faq" className="container mx-auto max-w-3xl px-4 pb-16 pt-4 sm:pb-24">
          <div className="kr">
            <p className="kit-caps text-primary">Dudas</p>
            <h2 id="t-faq" className="mt-3 font-serif text-[2.6rem] leading-[1] sm:text-[3.4rem]">Preguntas frecuentes</h2>
          </div>
          <div className="mt-8 border-t border-[var(--kit-line)]">
            {[
              {
                q: "¿Puedo mezclar aromas?",
                a: <>Sí. Combina los que quieras, incluso repetidos, y el precio del kit se mantiene.</>,
              },
              {
                q: "¿Cuánto cuesta cada kit?",
                a: (
                  <>
                    {KIT_TIERS.map((t) => `${t.label}: ${fmt(t.price)} (${fmt(perBottle(t))} por frasco)`).join(" · ")}.
                    {" "}Por unidad, cada frasco cuesta {fmt(UNIT_PRICE)}.
                  </>
                ),
              },
              {
                q: "¿Cómo pago?",
                a: (
                  <>
                    Pagas en línea al finalizar tu pedido, con Mercado Pago: tarjetas de crédito y débito (Visa,
                    Mastercard, American Express), PSE y billeteras digitales según disponibilidad. No manejamos pago
                    contra entrega.
                  </>
                ),
              },
              {
                q: "¿Cuánto cuesta el envío y cuándo llega?",
                a: (
                  <>
                    Enviamos a todo Colombia. Es gratis en compras desde {fmt(freeShippingThreshold)}; por debajo de
                    ese valor cuesta {fmt(SHIPPING_COST)}. La entrega estimada es de 7 a 9 días hábiles (municipios y
                    zonas apartadas pueden tardar algunos días más) y recibes un número de guía para rastrear tu pedido.
                  </>
                ),
              },
              {
                q: "¿Se puede usar sobre la ropa?",
                a: (
                  <>
                    Sí. La fórmula no contiene aceites grasos ni colorantes: puedes rociarla sobre prendas, telas,
                    empaques y mobiliario claro sin dejar residuo.
                  </>
                ),
              },
              {
                q: "¿Y si hay un problema con mi pedido?",
                a: (
                  <>
                    Tienes garantía de 30 días calendario desde que recibes el producto y, por ser una compra en línea,
                    derecho de retracto dentro de los 5 días hábiles siguientes a la entrega. Revisa las condiciones en
                    nuestros{" "}
                    <Link href="/terminos" className="underline underline-offset-4">términos y condiciones</Link>.
                  </>
                ),
              },
              {
                q: "¿Hacen aromas personalizados?",
                a: (
                  <>
                    Sí, para marcas, tiendas, hoteles y spas.{" "}
                    <a href={waHref} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                      Escríbenos por WhatsApp
                    </a>{" "}
                    y te contamos cómo funciona.
                  </>
                ),
              },
            ].map((f, i) => (
              <details key={f.q} className="kit-faq kr group border-b border-[var(--kit-line)]" style={delay(Math.min(i, 4) * 50)}>
                <summary
                  className={`flex cursor-pointer list-none items-center justify-between gap-4 rounded-md py-5 font-serif text-[1.3rem] leading-snug transition-colors hover:text-primary sm:text-[1.45rem] [&::-webkit-details-marker]:hidden ${focusRing}`}
                >
                  {f.q}
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-[var(--kit-line-strong)] text-primary transition-[transform,background-color,border-color] duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-open:rotate-45 group-open:border-primary group-open:bg-primary group-open:text-primary-foreground">
                    <Plus className="h-4 w-4" aria-hidden />
                  </span>
                </summary>
                <p className="kit-faq-a max-w-[62ch] pb-6 pr-10 text-[15px] leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      {/* ── Resumen fijo del kit ── */}
      <div
        role="region"
        aria-label="Resumen de tu kit"
        data-complete={complete ? "" : undefined}
        className={`kit-root kit-tray fixed inset-x-0 bottom-0 z-40 border-t border-[var(--kit-line)] bg-card/90 shadow-[0_-12px_32px_-12px_rgba(45,26,20,0.18)] backdrop-blur-xl ${
          trayOn ? "visible translate-y-0" : "invisible translate-y-full"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Barra de progreso del kit (decorativa; la accesible son los círculos) */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-[var(--kit-line)]">
          <div
            className={`kit-progress h-full ${complete ? "bg-primary" : "bg-primary/70"}`}
            style={{ transform: `scaleX(${tier.units ? picks.length / tier.units : 0})` }}
          />
        </div>
        <div className="container mx-auto flex flex-col gap-2.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:py-4">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-serif text-xl leading-tight sm:text-[1.4rem]">{tier.label}</span>
                <span className="kit-num text-[15px] font-semibold">{fmt(tier.price)}</span>
                <span className="hidden text-xs text-primary sm:inline">Ahorras <span className="kit-num">{fmt(tierSavings(tier))}</span></span>
              </div>
              <p
                className={`flex items-center gap-1.5 text-xs ${complete ? "font-semibold text-primary" : "text-muted-foreground"}`}
                aria-live="polite"
              >
                {complete && <Check key="ok" className="kit-pop h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />}
                <span key={hint} className="kit-fade">{hint}</span>
              </p>
            </div>
            <div
              className="flex flex-none gap-1 sm:gap-1.5"
              role="progressbar"
              aria-label="Aromas elegidos"
              aria-valuemin={0}
              aria-valuemax={tier.units}
              aria-valuenow={picks.length}
            >
              {Array.from({ length: tier.units }).map((_, i) => {
                const a = picks[i] ? byId.get(picks[i]) : null
                return (
                  <span
                    key={i}
                    className={`kit-slot relative block h-7 w-7 overflow-hidden rounded-full bg-secondary sm:h-8 sm:w-8 ${
                      a ? "border border-foreground/80" : "border border-dashed border-primary/60"
                    }`}
                    style={{ transitionDelay: `${i * 40}ms` }}
                  >
                    {a && (
                      <span key={`${picks[i]}-${i}`} className="kit-pop absolute inset-0 block">
                        <Image src={a.image} alt="" fill sizes="32px" className="object-cover" />
                      </span>
                    )}
                  </span>
                )
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-none">
            <button
              type="button"
              onClick={() => handleAdd(false)}
              disabled={!complete || busy}
              className={`kit-press inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-foreground px-3 py-3 text-sm font-semibold enabled:hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40 sm:px-5 ${
                added ? "disabled:opacity-100" : ""
              } ${focusRing}`}
            >
              {added ? (
                <span key="ok" className="kit-fade inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-primary" strokeWidth={2.5} aria-hidden /> Agregado
                </span>
              ) : (
                <>
                  <ShoppingBag className="hidden h-4 w-4 sm:block" aria-hidden /> Agregar al carrito
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => handleAdd(true)}
              disabled={!complete || busy}
              data-ready={complete ? "" : undefined}
              className={`kit-press kit-sheen group inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-foreground px-3 py-3 text-sm font-semibold text-background enabled:hover:shadow-[var(--kit-shadow-md)] disabled:cursor-not-allowed disabled:opacity-40 sm:px-6 ${focusRing}`}
            >
              {busy ? "Procesando…" : <>Ir a pagar <ArrowRight className="kit-arrow hidden h-4 w-4 sm:block" aria-hidden /></>}
            </button>
          </div>
        </div>
      </div>

      {/* Avisos (kit lleno, atajos, agregado) */}
      <div
        role="status"
        aria-live="polite"
        className={`kit-root kit-toast pointer-events-none fixed left-1/2 z-50 w-max max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-full bg-foreground px-5 py-3 text-center text-sm text-background shadow-[var(--kit-shadow-lg)] ${
          toast ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        } ${trayOn ? "bottom-[13.5rem] sm:bottom-44" : "bottom-6"}`}
      >
        {toast}
      </div>

      <WhatsAppButton raisedClass={trayOn ? "bottom-36 sm:bottom-28" : undefined} />
    </>
  )
}
