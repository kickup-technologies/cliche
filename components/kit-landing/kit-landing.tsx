"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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

/**
 * Landing "Arma tu kit" (estructura de la maqueta de la agencia, datos reales).
 * El kit se agrega con `addPack` (dispara AddToCart) y el pago va por el
 * `checkout()` del carrito (dispara InitiateCheckout con content_ids del
 * catálogo) → /checkout → Mercado Pago. Mismo flujo que el PackBuilder.
 */

const KIT_TIERS = PRICE_TIERS.filter((t) => t.units > 1)
const DEFAULT_TIER = KIT_TIERS[0]
const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`
const perBottle = (t: { price: number; units: number }) => Math.round(t.price / t.units)
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

/** "A, B y C" (o "A, B o C" con conj = "o") */
function joinNames(names: string[], conj = "y"): string {
  if (names.length <= 1) return names.join("")
  return `${names.slice(0, -1).join(", ")} ${conj} ${names[names.length - 1]}`
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
  const armarRef = useRef<HTMLElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const viewSent = useRef(false)

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
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

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

  return (
    <>
      <main className="min-h-screen bg-background pb-44 pt-28 text-foreground sm:pb-32 sm:pt-32">
        {/* ── Navidad (solo si el Aroma Navidad está activo) ── */}
        {christmasAromaId && (
          <div className="container mx-auto px-4">
            <div className="flex flex-col gap-3 rounded-2xl bg-secondary px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-start gap-2.5">
                <Gift className="mt-0.5 h-4 w-4 flex-none text-primary" aria-hidden />
                <span>
                  <strong className="font-semibold">Edición especial de Navidad:</strong> el Aroma{" "}
                  {christmasAromaName} ya está disponible para tu kit.
                </span>
              </p>
              <button
                type="button"
                onClick={() => addPick(christmasAromaId)}
                className={`self-start rounded-full border border-foreground/20 bg-card px-4 py-1.5 text-xs font-semibold sm:self-auto ${focusRing}`}
              >
                Sumarlo a mi kit
              </button>
            </div>
          </div>
        )}

        {/* ── Hero ── */}
        <section aria-labelledby="t-hero" className="container mx-auto px-4 pb-12 pt-6 lg:pt-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-14">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-secondary">
              <Image
                src="/images/category-kits-marca.png"
                alt="Caja de regalo con tres sprays de 250 ml: Aire, Agua y Sello de Dios"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                // Encuadre en los frascos (la tapa de la caja trae texto ajeno a Cliché).
                style={{ objectPosition: "50% 68%" }}
              />
            </div>

            <div className="flex min-w-0 flex-col gap-5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
                Kits de aromas · Cliché Colombia
              </span>
              <h1 id="t-hero" className="font-serif text-4xl leading-[1.08] sm:text-5xl">
                Arma tu kit con los aromas que tú eliges
              </h1>
              <p className="max-w-[60ch] text-base text-muted-foreground sm:text-lg">
                Combina {joinNames(KIT_TIERS.map((t) => String(t.units)), "o")} aromas para tu marca, tu tienda,
                tu casa o tu ropa. Sprays de 250 ml de alta concentración, hechos en Colombia.
              </p>

              <div>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
                  <span className="font-serif text-4xl font-semibold tabular-nums">{fmt(DEFAULT_TIER.price)}</span>
                  <span className="rounded-full bg-secondary px-3 py-0.5 text-sm text-accent">
                    {DEFAULT_TIER.label} · {fmt(perBottle(DEFAULT_TIER))} por frasco
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Por separado, {DEFAULT_TIER.units} aromas cuestan {fmt(DEFAULT_TIER.units * UNIT_PRICE)}: ahorras{" "}
                  <strong className="font-semibold text-foreground">{fmt(tierSavings(DEFAULT_TIER))}</strong>.
                </p>
              </div>

              <ul className="grid gap-2.5 text-[15px]">
                {[
                  "Mezcla los aromas que quieras al mismo precio del kit",
                  "Pago seguro en línea con Mercado Pago: tarjetas, PSE y billeteras digitales",
                  `Envío a todo Colombia, gratis en compras desde ${fmt(freeShippingThreshold)}`,
                  "Alta concentración, no mancha y sin parabenos",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-secondary text-primary">
                      <Check className="h-3 w-3" aria-hidden />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>

              <a
                href="#armar"
                className={`inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-8 py-4 text-sm font-semibold text-background transition-opacity hover:opacity-90 sm:self-start ${focusRing}`}
              >
                Armar mi kit <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
            </div>
          </div>
        </section>

        {/* ── Beneficios ── */}
        <section aria-label="Beneficios del kit" className="container mx-auto px-4 pb-12">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
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
            ].map(({ Icon, t, d }) => (
              <li key={t} className="rounded-2xl border border-border bg-card p-5">
                <Icon className="h-5 w-5 text-primary" aria-hidden />
                <p className="mt-3 font-serif text-lg leading-snug">{t}</p>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
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
          className="container mx-auto scroll-mt-28 px-4 py-14"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">Paso 1 · Tamaño</span>
          <h2 id="t-armar" className="mt-2 font-serif text-3xl sm:text-4xl">Arma tu kit</h2>

          <div role="group" aria-label="Tamaño del kit" className="mt-6 grid grid-cols-3 gap-2.5 sm:gap-4">
            {KIT_TIERS.map((t) => {
              const active = t.id === tier.id
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => selectTier(t.id)}
                  className={`relative flex flex-col items-center gap-0.5 rounded-2xl border-2 px-1.5 pb-3 pt-5 text-center transition-colors ${focusRing} ${
                    active ? "border-foreground bg-secondary" : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  {t.badge && (
                    <span className="absolute -top-2.5 whitespace-nowrap rounded-full bg-primary px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-primary-foreground sm:text-[10.5px]">
                      {t.badge}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground sm:text-sm">{t.label}</span>
                  <span className="font-serif text-xl font-semibold tabular-nums sm:text-2xl">{fmt(t.price)}</span>
                  <span className="text-[11px] text-accent sm:text-xs">{fmt(perBottle(t))} c/u</span>
                  <span className="text-[10.5px] text-muted-foreground sm:text-xs">
                    <span className="sr-only">Precio por separado: </span>
                    <s>{fmt(t.units * UNIT_PRICE)}</s>
                  </span>
                  <span className="mt-0.5 text-[10.5px] font-semibold text-primary sm:text-xs">
                    Ahorras {fmt(tierSavings(t))}
                  </span>
                </button>
              )
            })}
          </div>

          <span className="mt-10 block text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
            Paso 2 · ¿Para qué lo quieres?
          </span>
          <div
            role="group"
            aria-label="Filtrar aromas por uso"
            className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
          >
            {[{ key: "todos", label: "Todos" }, ...segments].map((s) => (
              <button
                key={s.key}
                type="button"
                aria-pressed={filter === s.key}
                onClick={() => setFilter(s.key)}
                className={`flex-none rounded-full border px-4 py-2 text-sm transition-colors ${focusRing} ${
                  filter === s.key
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Atajos:</span>
            {bestSellers.length > 0 && (
              <button
                type="button"
                onClick={() => fillWith(bestSellers.map((a) => a.id))}
                className={`rounded-full border border-dashed border-primary px-3 py-1.5 text-accent hover:bg-secondary ${focusRing}`}
              >
                Los más vendidos
              </button>
            )}
            {filter !== "todos" && visible.length > 0 && (
              <button
                type="button"
                onClick={() => fillWith(visible.map((a) => a.id))}
                className={`rounded-full border border-dashed border-primary px-3 py-1.5 text-accent hover:bg-secondary ${focusRing}`}
              >
                Sugerencia para {segments.find((s) => s.key === filter)?.label.toLowerCase()}
              </button>
            )}
            {christmasCombo.length > 0 && (
              <button
                type="button"
                onClick={() => fillWith(christmasCombo)}
                className={`rounded-full border border-dashed border-primary px-3 py-1.5 text-accent hover:bg-secondary ${focusRing}`}
              >
                Sugerencia de Navidad
              </button>
            )}
            {picks.length > 0 && (
              <button
                type="button"
                onClick={() => setPicks([])}
                className={`rounded px-1 text-accent underline underline-offset-4 ${focusRing}`}
              >
                Vaciar kit
              </button>
            )}
          </div>

          <div className="mt-10 flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
              Paso 3 · Elige tus aromas
            </span>
            <span className="text-sm text-muted-foreground">
              {picks.length} de {tier.units} elegidos · puedes repetir
            </span>
          </div>

          {visible.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No hay aromas disponibles en este filtro.</p>
          ) : (
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {visible.map((a) => {
                const n = counts.get(a.id) ?? 0
                const canAddMore = picks.length < tier.units && n < a.stock
                return (
                  <li
                    key={a.id}
                    className={`flex flex-col overflow-hidden rounded-2xl border bg-card transition-shadow ${
                      n ? "border-foreground shadow-[0_0_0_1px_var(--foreground)]" : "border-border"
                    }`}
                  >
                    <div className="relative aspect-square bg-secondary">
                      <Image
                        src={a.image}
                        alt={`Spray de aroma ${a.name}`}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
                        className="object-cover"
                      />
                      {a.badge && (
                        <span className="absolute left-2 top-2 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-background">
                          {a.badge}
                        </span>
                      )}
                      {n > 0 && (
                        <span
                          aria-hidden
                          className="absolute right-2 top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-1.5 text-sm font-semibold text-primary-foreground"
                        >
                          {n}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-3">
                      <h3 className="font-serif text-base leading-tight sm:text-lg">{a.name}</h3>
                      {a.notes.length > 0 && (
                        <p className="text-xs leading-snug text-foreground/75">
                          <span className="sr-only">Notas: </span>
                          {a.notes.join(" · ")}
                        </p>
                      )}
                      {a.idealFor && (
                        <p className="text-[11px] leading-snug text-muted-foreground">Ideal para: {a.idealFor}</p>
                      )}
                      {a.family && (
                        <span className="mt-0.5 self-start rounded-full bg-secondary px-2 py-0.5 text-[10.5px] text-accent">
                          Familia: {a.family}
                        </span>
                      )}
                      <div className="mt-auto pt-2.5">
                        {n === 0 ? (
                          <button
                            type="button"
                            onClick={() => addPick(a.id)}
                            aria-label={`Agregar ${a.name} al kit`}
                            className={`flex w-full items-center justify-center gap-1.5 rounded-xl border border-foreground py-2.5 text-sm font-semibold transition-colors hover:bg-secondary ${focusRing}`}
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden /> Agregar
                          </button>
                        ) : (
                          <div className="flex items-center justify-between rounded-xl border border-foreground">
                            <button
                              type="button"
                              onClick={() => removePick(a.id)}
                              aria-label={`Quitar un ${a.name}`}
                              className={`flex h-10 w-10 items-center justify-center rounded-xl ${focusRing}`}
                            >
                              <Minus className="h-4 w-4" aria-hidden />
                            </button>
                            <span className="text-sm font-semibold">{n} en tu kit</span>
                            <button
                              type="button"
                              onClick={() => addPick(a.id)}
                              disabled={!canAddMore}
                              aria-label={`Agregar otro ${a.name}`}
                              className={`flex h-10 w-10 items-center justify-center rounded-xl disabled:cursor-not-allowed disabled:opacity-30 ${focusRing}`}
                            >
                              <Plus className="h-4 w-4" aria-hidden />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* ── Cómo se usa (mismo texto que la ficha de producto) ── */}
        <section aria-labelledby="t-uso" className="border-t border-border">
          <div className="container mx-auto grid items-center gap-8 px-4 py-14 md:grid-cols-2 md:gap-14">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-secondary md:aspect-[4/5]">
              <Image
                src="/images/category-ropa.png"
                alt="Spray Eternamente Índigo sobre un mostrador de una tienda de ropa"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className="flex flex-col gap-5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">Cómo se usa</span>
              <h2 id="t-uso" className="font-serif text-3xl sm:text-4xl">Unos puf y el espacio cambia</h2>
              <dl className="grid gap-4">
                {USAGE_TIPS.map((u) => (
                  <div key={u.title}>
                    <dt className="font-serif text-lg">{u.title}</dt>
                    <dd className="mt-0.5 text-muted-foreground">{u.desc}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* ── Reseñas reales aprobadas (tabla `reviews`) ── */}
        {reviews.length > 0 && (
          <section aria-labelledby="t-resenas" className="border-t border-border">
            <div className="container mx-auto px-4 py-14">
              <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">Reseñas de clientes</span>
              <h2 id="t-resenas" className="mt-2 font-serif text-3xl sm:text-4xl">Lo que dicen quienes ya lo usan</h2>
              <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {reviews.map((r) => (
                  <li key={r.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
                    <p className="flex gap-0.5 text-primary" aria-label={`${r.rating} de 5 estrellas`}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-current" : "opacity-25"}`} aria-hidden />
                      ))}
                    </p>
                    <blockquote className="whitespace-pre-line font-serif text-lg leading-snug">“{r.comment}”</blockquote>
                    <p className="text-sm text-muted-foreground">
                      {r.name}
                      {r.aroma && <span className="text-accent"> · {r.aroma}</span>}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* ── B2B: aroma exclusivo ── */}
        <section aria-labelledby="t-propio" className="container mx-auto px-4 py-14">
          <div className="grid overflow-hidden rounded-3xl bg-foreground text-background md:grid-cols-2">
            <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[360px]">
              <Image
                src="/images/category-hoteles.png"
                alt="Spray de aroma Aire en la recepción de un hotel"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className="flex flex-col justify-center gap-4 px-6 py-8 sm:px-10">
              <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#E8C9B8]">
                Para marcas, hoteles y spas
              </span>
              <h2 id="t-propio" className="font-serif text-3xl text-white sm:text-4xl">
                ¿Quieres un aroma exclusivo para tu marca?
              </h2>
              <p className="text-background/80">
                Diseñamos identidades olfativas a la medida para marcas, tiendas, hoteles y spas. Cuéntanos sobre tu
                marca y lo coordinamos con el equipo.
              </p>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center justify-center gap-2 self-start rounded-full bg-background px-6 py-3.5 text-sm font-semibold text-foreground transition-opacity hover:opacity-90 ${focusRing}`}
              >
                <MessageCircle className="h-4 w-4" aria-hidden /> Cotizar mi aroma por WhatsApp
              </a>
            </div>
          </div>
        </section>

        {/* ── Preguntas frecuentes ── */}
        <section aria-labelledby="t-faq" className="container mx-auto max-w-3xl px-4 py-14">
          <h2 id="t-faq" className="font-serif text-3xl sm:text-4xl">Preguntas frecuentes</h2>
          <div className="mt-6 grid gap-2.5">
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
            ].map((f) => (
              <details key={f.q} className="group rounded-2xl border border-border bg-card px-5">
                <summary
                  className={`flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium [&::-webkit-details-marker]:hidden ${focusRing}`}
                >
                  {f.q}
                  <Plus className="h-4 w-4 flex-none text-primary transition-transform group-open:rotate-45" aria-hidden />
                </summary>
                <p className="pb-4 text-[15px] text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      {/* ── Resumen fijo del kit ── */}
      <div
        role="region"
        aria-label="Resumen de tu kit"
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 shadow-[0_-8px_24px_rgba(45,26,20,0.08)] backdrop-blur transition-[transform,visibility] duration-300 ${
          trayOn ? "visible translate-y-0" : "invisible translate-y-full"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="container mx-auto flex flex-col gap-2.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-serif text-lg font-semibold leading-tight">{tier.label} · {fmt(tier.price)}</span>
                <span className="hidden text-xs text-primary sm:inline">Ahorras {fmt(tierSavings(tier))}</span>
              </div>
              <p className="text-xs text-muted-foreground" aria-live="polite">{hint}</p>
            </div>
            <div
              className="flex flex-none gap-1"
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
                    className={`relative block h-6 w-6 overflow-hidden rounded-full sm:h-7 sm:w-7 ${
                      a ? "border border-foreground bg-secondary" : "border border-dashed border-primary bg-secondary"
                    }`}
                  >
                    {a && <Image src={a.image} alt="" fill sizes="28px" className="object-cover" />}
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
              className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-foreground px-3 py-3 text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40 sm:px-5 ${focusRing}`}
            >
              <ShoppingBag className="hidden h-4 w-4 sm:block" aria-hidden /> Agregar al carrito
            </button>
            <button
              type="button"
              onClick={() => handleAdd(true)}
              disabled={!complete || busy}
              className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-foreground px-3 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:px-6 ${focusRing}`}
            >
              {busy ? "Procesando…" : "Ir a pagar"}
            </button>
          </div>
        </div>
      </div>

      {/* Avisos (kit lleno, atajos, agregado) */}
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed left-1/2 z-50 w-max max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-xl bg-foreground px-4 py-2.5 text-center text-sm text-background shadow-lg transition-opacity ${
          toast ? "opacity-100" : "opacity-0"
        } ${trayOn ? "bottom-[13.5rem] sm:bottom-44" : "bottom-6"}`}
      >
        {toast}
      </div>

      <WhatsAppButton raisedClass={trayOn ? "bottom-36 sm:bottom-28" : undefined} />
    </>
  )
}
