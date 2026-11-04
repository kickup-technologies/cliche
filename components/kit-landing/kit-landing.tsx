"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useCart, type PackComponent } from "@/context/cart-context"
import { useCAPI } from "@/lib/use-capi"
import { PRICE_TIERS, SHIPPING_COST, TIER_BY_ID, UNIT_PRICE, type PriceTier } from "@/lib/pricing"
import {
  CHRISTMAS_COMBO,
  CHRISTMAS_DEADLINE_LABEL,
  USAGE_TIPS,
  USOS,
  type KitAroma,
} from "@/lib/kit-landing-content"
import { MqBrands, MqFooter, MqTests, waDisplay, waHref, type TestimonioId } from "@/components/landing-maqueta/parts"
import "./kit-landing.css"

/**
 * Landing "Arma tu kit" — la maqueta de Cliché (landings/kits-cliche) TAL CUAL:
 * mismo orden de secciones, textos, imágenes y armador (tamaño, uso, aromas y
 * bandeja fija). Decisión del cliente: ese diseño vende más que el rediseño.
 *
 * Lo que cambia frente a la maqueta es lo que la maqueta simulaba:
 * - El pedido NO es contra entrega (Cliché no lo ofrece): el panel "Confirma
 *   tu pedido" resume el kit y lleva al pago real. El kit entra al carrito con
 *   `addPack` (dispara AddToCart) y se paga con el `checkout()` del carrito
 *   (dispara InitiateCheckout) → /checkout → Mercado Pago. Mismo flujo que el
 *   PackBuilder de la ficha; el pedido lleva los aromas elegidos.
 * - Medios y condiciones reales: tarjeta, PSE o Nequi; envío de SHIPPING_COST,
 *   gratis desde el umbral del panel; entrega de 7 a 9 días hábiles; garantía
 *   y retracto de los términos.
 * - Aromas, notas, fotos, insignias, stock y calificaciones salen de la BD.
 */

const KIT_TIERS = PRICE_TIERS.filter((t) => t.units > 1)
const DEFAULT_TIER = KIT_TIERS[0]
const fmt = (n: number) => `$${new Intl.NumberFormat("es-CO").format(Math.round(n))}`
const perBottle = (t: PriceTier) => Math.round(t.price / t.units)
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

/**
 * Etiqueta de cada tamaño. El x4 dice "Recomendado" y no "Más popular" (el
 * badge de lib/pricing): no hay datos de ventas que respalden "más popular".
 */
const flagFor = (t: PriceTier) => (t.id === "x4" ? "Recomendado" : t.badge)

/** Testimonios de la maqueta de kits, en su orden. */
const TESTS: readonly TestimonioId[] = ["mariana", "catalina", "andres", "laura", "daniela", "camila", "valentina"]

/** Desplaza a una sección respetando el scroll suave de Lenis si está activo. */
function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const lenis = (window as unknown as { __lenis?: { scrollTo: (t: HTMLElement) => void } }).__lenis
  if (lenis) lenis.scrollTo(el)
  else el.scrollIntoView({ behavior: "smooth", block: "start" })
}

interface Props {
  aromas: KitAroma[]
  freeShippingThreshold: number
  whatsappNumber: string
  christmasAromaId: string | null
  christmasAromaName: string | null
  /** false después de la fecha límite de Navidad (la calcula el servidor) */
  showChristmasDeadline: boolean
}

export function KitLanding({
  aromas,
  freeShippingThreshold,
  whatsappNumber,
  christmasAromaId,
  christmasAromaName,
  showChristmasDeadline,
}: Props) {
  const { addPack, openDrawer, checkout, items, total: cartTotal } = useCart()
  const { track } = useCAPI()

  const [tierId, setTierId] = useState(DEFAULT_TIER.id)
  const [picks, setPicks] = useState<string[]>([])
  const [filter, setFilter] = useState("todos")
  const [toast, setToast] = useState<string | null>(null)
  const [trayOn, setTrayOn] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [goPay, setGoPay] = useState(false)
  const armarRef = useRef<HTMLElement>(null)
  const payRef = useRef<HTMLButtonElement>(null)
  const lastFocus = useRef<HTMLElement | null>(null)
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

  const usos = useMemo(
    () => USOS.filter((u) => u.key === "todos" || aromas.some((a) => a.uses.includes(u.key))),
    [aromas],
  )
  const visible = useMemo(
    () => (filter === "todos" ? aromas : aromas.filter((a) => a.uses.includes(filter))),
    [aromas, filter],
  )
  const bestSellers = useMemo(() => aromas.filter((a) => a.bestSeller).map((a) => a.id), [aromas])
  const christmasCombo = useMemo(() => {
    if (!christmasAromaId) return []
    const bySlug = new Map(aromas.map((a) => [a.slug.replace(/^aroma-/, ""), a.id]))
    return CHRISTMAS_COMBO.map((s) => bySlug.get(s)).filter((id): id is string => !!id)
  }, [aromas, christmasAromaId])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }, [])
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
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
  const addPick = (id: string) => {
    const a = byId.get(id)
    if (!a) return
    if (picks.length >= tier.units) {
      showToast(`Tu kit x${tier.units} ya está completo. Quita un aroma o elige un kit más grande.`)
      return
    }
    // Stock real: no se puede pedir más frascos de los que hay de ese aroma.
    if ((counts.get(id) ?? 0) >= a.stock) {
      showToast(`No hay más unidades disponibles de ${a.name}.`)
      return
    }
    setPicks((prev) => [...prev, id])
  }

  const removePick = (id: string) => {
    setPicks((prev) => {
      const i = prev.lastIndexOf(id)
      if (i < 0) return prev
      const next = prev.slice()
      next.splice(i, 1)
      return next
    })
  }

  const fillWith = (ids: string[]) => {
    const next = ids.filter((id) => byId.has(id)).slice(0, tier.units)
    if (!next.length) return
    setPicks(next)
    const falta = tier.units - next.length
    const nombres = next.map((id) => byId.get(id)!.name).join(", ")
    showToast(
      `Tu kit ahora tiene ${nombres}` +
        (falta > 0 ? `. Te ${plural(falta, "falta 1 aroma", `faltan ${falta} aromas`)}.` : "."),
    )
  }

  const selectTier = (t: PriceTier) => {
    setTierId(t.id)
    if (picks.length > t.units) {
      setPicks((prev) => prev.slice(0, t.units))
      showToast(`Ajustamos tu selección al kit x${t.units}.`)
    }
  }

  // ── Panel "Confirma tu pedido" ──
  const openPanel = () => {
    if (!complete) return
    lastFocus.current = document.activeElement as HTMLElement | null
    setPanelOpen(true)
  }
  const closePanel = useCallback(() => {
    setPanelOpen(false)
    lastFocus.current?.focus()
  }, [])

  // Mientras el panel está abierto: sin scroll del fondo (incluye Lenis),
  // Escape cierra y el foco arranca en el botón de pago.
  useEffect(() => {
    if (!panelOpen) return
    const lenis = (window as unknown as { __lenis?: { stop: () => void; start: () => void } }).__lenis
    lenis?.stop()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closePanel() }
    document.addEventListener("keydown", onKey)
    const t = setTimeout(() => payRef.current?.focus(), 50)
    return () => {
      clearTimeout(t)
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
      lenis?.start()
    }
  }, [panelOpen, closePanel])

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
      setPanelOpen(false)
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

  // ── Bandeja: visible al llegar al armador o con aromas elegidos ──
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
    ? "Kit completo"
    : picks.length
      ? `Llevas ${picks.length} de ${tier.units} · elige ${missing} más`
      : `Elige ${tier.units} aromas`

  // Totales del panel con la misma regla del checkout: envío gratis si el
  // carrito completo (lo que ya había + este kit) llega al umbral.
  const subtotal = cartTotal + tier.price
  const shipping = subtotal >= freeShippingThreshold ? 0 : SHIPPING_COST
  const otherItems = items.length > 0

  const waNum = whatsappNumber
  const faqs: { q: string; a: React.ReactNode }[] = [
    { q: "¿Puedo mezclar aromas?", a: "Sí. Combina los que quieras, incluso repetidos, y el precio del kit se mantiene." },
    {
      q: "¿Cómo pago?",
      a: "Pagas en línea al confirmar tu pedido, con tarjeta, PSE o Nequi, a través de Mercado Pago.",
    },
    {
      q: "¿Cuándo llega?",
      a: `Lo despachamos el siguiente día hábil y llega de 7 a 9 días hábiles. El envío cuesta ${fmt(SHIPPING_COST)} y es gratis desde ${fmt(freeShippingThreshold)}.`,
    },
    ...(showChristmasDeadline
      ? [{ q: "¿Llega para Navidad?", a: `Sí, si lo pides hasta ${CHRISTMAS_DEADLINE_LABEL}.` }]
      : []),
    {
      q: "¿Se puede usar sobre la ropa?",
      a: "Sí. La fórmula es sin aceites grasos ni colorantes, así que puedes aplicarla sobre telas y muebles claros.",
    },
    {
      q: "¿Y si quiero cambiarlo?",
      a: (
        <>
          Tienes 5 días hábiles desde que lo recibes para retractarte de la compra, con el producto sin usar y en su
          empaque, y 30 días de garantía. Las condiciones están en los{" "}
          <Link href="/terminos" target="_blank" rel="noopener">términos</Link>.
        </>
      ),
    },
    {
      q: "¿Hacen aromas personalizados?",
      a: "Sí, para marcas, tiendas, hoteles y spas. Escríbenos por WhatsApp y te contamos cómo funciona.",
    },
  ]

  return (
    <div className="mq-kits">
      <div className="wrap">
        {/* Condiciones reales: sin pago contra entrega (la maqueta decía "Pagas al
            recibir"); el despacho es al siguiente día hábil, como en la ficha.
            Textos cortos para que la franja quepa en dos líneas en el celular. */}
        <div className="topbar" aria-label="Condiciones">
          <span>Tarjeta, PSE o Nequi</span>
          <span>Despacho en 1 día hábil</span>
          <span>Gratis desde {fmt(freeShippingThreshold)}</span>
          <span>Hecho en Medellín</span>
        </div>
        <header className="brand">
          <Link href="/" aria-label="Cliché, ir a la tienda">
            <Image src="/images/logo-cliche.png" alt="Cliché" width={92} height={78} priority />
          </Link>
          <a className="wa-link" href={waHref(waNum)} target="_blank" rel="noopener noreferrer">
            WhatsApp {waDisplay(waNum)}
          </a>
        </header>
        {christmasAromaId && (
          <div className="season">
            <span className="dot" aria-hidden />
            <span>
              <b>Navidad:</b> llegó el Aroma {christmasAromaName}, edición especial.
              {showChristmasDeadline && <> Pide hasta {CHRISTMAS_DEADLINE_LABEL}.</>}
            </span>
          </div>
        )}

        <section className="hero" aria-label="Kits de aromas">
          <Image
            className="hero-img"
            src="/images/category-kits-marca.png"
            alt="Caja de regalo con tres sprays de aroma Cliché"
            width={1024}
            height={1536}
            priority
            sizes="(min-width: 900px) 520px, 100vw"
          />
          <div className="info">
            <span className="eyebrow">Kits de aromas · Cliché Colombia</span>
            <h1>Arma tu kit con los aromas que tú eliges</h1>
            <p className="sub" style={{ fontSize: 18 }}>
              Combina {KIT_TIERS.map((t) => t.units).join(", ").replace(/, (\d+)$/, " o $1")} aromas para tu tienda, tu
              casa o tu ropa. Sprays de 250 ml de alta concentración, hechos en Medellín.
            </p>
            <div className="price">
              <b>{fmt(DEFAULT_TIER.price)}</b>
              <span className="per">{DEFAULT_TIER.label} · {fmt(perBottle(DEFAULT_TIER))} por frasco</span>
            </div>
            <p className="cta-note" style={{ textAlign: "left", marginTop: -8 }}>
              Por separado, {DEFAULT_TIER.units} aromas cuestan {fmt(DEFAULT_TIER.units * UNIT_PRICE)}.
            </p>
            <ul className="assure">
              <li>Pagas en línea con tarjeta, PSE o Nequi</li>
              <li>Mezcla los aromas que quieras al mismo precio</li>
              <li>Se aplica sobre telas y muebles: fórmula sin aceites grasos ni colorantes</li>
              <li>30 días de garantía desde que lo recibes</li>
            </ul>
            <a
              className="btn btn-primary btn-wide"
              href="#armar"
              onClick={(e) => { e.preventDefault(); scrollToId("armar") }}
            >
              Armar mi kit
            </a>
            <p className="cta-note">Elige tus aromas y pide en un minuto.</p>
          </div>
        </section>

        <MqBrands label="Marcas colombianas que usan aromas Cliché" />

        <section className="block" id="armar" ref={armarRef} aria-labelledby="t-armar">
          <span className="eyebrow">Paso 1 · Tamaño</span>
          <h2 id="t-armar">Arma tu kit</h2>
          <div className="sizes" role="group" aria-label="Tamaño del kit">
            {KIT_TIERS.map((t) => {
              const flag = flagFor(t)
              const separado = t.units * UNIT_PRICE
              return (
                <button
                  key={t.id}
                  className="size"
                  type="button"
                  aria-pressed={t.id === tier.id}
                  onClick={() => selectTier(t)}
                >
                  {flag && <span className="flag">{flag}</span>}
                  <span className="t">{t.label}</span>
                  <b>{fmt(t.price)}</b>
                  <s aria-label={`Por separado ${fmt(separado)}`}>Por separado {fmt(separado)}</s>
                  <span className="u">{fmt(perBottle(t))} c/u</span>
                </button>
              )
            })}
          </div>

          <span className="eyebrow" style={{ marginTop: 8 }}>Paso 2 · ¿Para qué lo quieres?</span>
          <div className="chips" role="group" aria-label="Filtrar aromas por uso">
            {usos.map((u) => (
              <button
                key={u.key}
                type="button"
                className="chip"
                aria-pressed={filter === u.key}
                onClick={() => setFilter(u.key)}
              >
                {u.label}
              </button>
            ))}
          </div>
          <div className="picks">
            <span>Atajos:</span>
            {bestSellers.length > 0 && (
              <button className="pick" type="button" onClick={() => fillWith(bestSellers)}>Los más vendidos</button>
            )}
            {christmasCombo.length > 0 && (
              <button className="pick" type="button" onClick={() => fillWith(christmasCombo)}>Sugerencia de Navidad</button>
            )}
            <button className="linkish" type="button" onClick={() => setPicks([])}>Vaciar kit</button>
          </div>

          <span className="eyebrow" style={{ marginTop: 8 }}>Paso 3 · Elige tus aromas</span>
          <div className="grid" aria-live="polite">
            {visible.length === 0 ? (
              <p className="empty">Sin aromas en este filtro.</p>
            ) : (
              visible.map((a) => {
                const n = counts.get(a.id) ?? 0
                const canAddMore = picks.length < tier.units && n < a.stock
                return (
                  <article key={a.id} className={`card${n ? " on" : ""}`}>
                    <div className="ph">
                      <Image
                        src={a.image}
                        alt={`Spray aroma ${a.name}`}
                        width={640}
                        height={640}
                        sizes="(min-width: 900px) 240px, 50vw"
                      />
                      {a.badge && <span className="bdg">{a.badge}</span>}
                      {n > 0 && <span className="n-on" aria-label={`${n} en tu kit`}>{n}</span>}
                    </div>
                    <div className="txt">
                      <h3>{a.name}</h3>
                      {a.notes.length > 0 && <p className="notes">{a.notes.join(" · ")}</p>}
                      {a.idealLine && <p className="ideal">{a.idealLine}</p>}
                      {a.rating !== null && a.ratingCount > 0 && (
                        <span className="rt">
                          <b>★</b> {String(a.rating).replace(".", ",")} · {a.ratingCount}{" "}
                          {plural(a.ratingCount, "reseña", "reseñas")}
                        </span>
                      )}
                      <div className="ctrl">
                        {n === 0 ? (
                          <button
                            type="button"
                            className="add"
                            aria-label={`Agregar ${a.name} al kit`}
                            onClick={() => addPick(a.id)}
                          >
                            Agregar
                          </button>
                        ) : (
                          <div className="step">
                            <button type="button" aria-label={`Quitar ${a.name}`} onClick={() => removePick(a.id)}>−</button>
                            <span>{n} en tu kit</span>
                            <button
                              type="button"
                              aria-label={`Agregar otro ${a.name}`}
                              disabled={!canAddMore}
                              onClick={() => addPick(a.id)}
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </section>

        <section className="block" aria-labelledby="t-uso">
          <div className="use">
            <Image
              src="/images/category-ropa.png"
              alt="Spray Eternamente Índigo en una tienda de ropa"
              width={1024}
              height={1536}
              sizes="(min-width: 900px) 540px, 100vw"
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <span className="eyebrow">Cómo se usa</span>
              <h2 id="t-uso">Unos puf y el espacio cambia</h2>
              <dl>
                {USAGE_TIPS.map((u) => (
                  <div key={u.title}>
                    <dt>{u.title}</dt>
                    <dd>{u.desc}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        <section className="block" aria-labelledby="t-tests">
          <span className="eyebrow">Negocios que ya tienen su aroma</span>
          <h2 id="t-tests">Lo que cuentan nuestros clientes</h2>
          <MqTests ids={TESTS} />
        </section>

        <section className="block" aria-labelledby="t-propio">
          <div className="custom">
            <Image
              src="/images/category-hoteles.png"
              alt="Spray de aroma Cliché en la recepción de un hotel"
              width={1023}
              height={1537}
              sizes="(min-width: 900px) 560px, 100vw"
            />
            <div className="txt">
              <span className="eyebrow">Para marcas, hoteles y spas</span>
              <h2 id="t-propio">¿Quieres un aroma exclusivo para tu marca?</h2>
              <p>
                Creamos la identidad olfativa de tu tienda, tu hotel o tu spa, y la llevamos a tus espacios, tus
                empaques y tus prendas.
              </p>
              <a
                className="btn"
                href={waHref(waNum, "Hola, quiero un aroma propio para mi marca")}
                target="_blank"
                rel="noopener noreferrer"
              >
                Cotizar mi aroma por WhatsApp
              </a>
            </div>
          </div>
        </section>

        <section className="block" aria-labelledby="t-faq">
          <h2 id="t-faq">Preguntas frecuentes</h2>
          <div>
            {faqs.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <MqFooter whatsappNumber={waNum} />
      </div>

      {/* ── Bandeja fija con el avance del kit ── */}
      <div className={`tray${trayOn ? " on" : ""}`} role="region" aria-label="Resumen de tu kit" inert={!trayOn}>
        <div className="tray-in">
          <div className="st">
            <b>{tier.label} · {fmt(tier.price)}</b>
            <small aria-live="polite">{hint}</small>
            <div className="dots" aria-hidden>
              {Array.from({ length: tier.units }).map((_, i) => {
                const a = picks[i] ? byId.get(picks[i]) : null
                return (
                  <i key={i} className={a ? "f" : undefined}>
                    {a && <Image src={a.image} alt="" width={44} height={44} sizes="22px" />}
                  </i>
                )
              })}
            </div>
          </div>
          <button className="btn btn-primary" type="button" disabled={!complete} onClick={openPanel}>
            Pedir mi kit
          </button>
        </div>
      </div>

      <div className="toast" role="status" hidden={!toast}>{toast}</div>

      {/* ── Panel "Confirma tu pedido": resumen y paso al pago real ── */}
      {panelOpen && (
        <div
          className="overlay"
          onClick={(e) => { if (e.target === e.currentTarget) closePanel() }}
        >
          <div className="panel" role="dialog" aria-modal="true" aria-labelledby="t-panel" data-lenis-prevent>
            <div className="panel-head">
              <h2 id="t-panel">Confirma tu pedido</h2>
              <button className="x" type="button" aria-label="Cerrar" onClick={closePanel}>×</button>
            </div>
            <div className="sum">
              <div className="row"><b>{tier.label}</b><b>{fmt(tier.price)}</b></div>
              <ul>
                {[...counts].map(([id, n]) => {
                  const a = byId.get(id)
                  if (!a) return null
                  return (
                    <li key={id}>
                      <Image src={a.image} alt="" width={72} height={72} sizes="36px" />
                      <span>{a.name}{n > 1 ? ` × ${n}` : ""}</span>
                    </li>
                  )
                })}
              </ul>
              <button
                className="linkish"
                type="button"
                onClick={() => { closePanel(); scrollToId("armar") }}
              >
                Cambiar aromas
              </button>
            </div>
            <div className="totals" aria-live="polite">
              <div><span>Kit</span><b>{fmt(tier.price)}</b></div>
              {otherItems && <div><span>Lo que ya tenías en el carrito</span><span>{fmt(cartTotal)}</span></div>}
              <div>
                <span>Envío</span>
                <span>{shipping === 0 ? "Gratis" : `${fmt(shipping)} · gratis desde ${fmt(freeShippingThreshold)}`}</span>
              </div>
              <div className="grand"><span>Total</span><b>{fmt(subtotal + shipping)}</b></div>
            </div>
            <p className="pay-note">
              Pagas en línea con tarjeta, PSE o Nequi. En el siguiente paso escribes tus datos de envío.
            </p>
            <button
              ref={payRef}
              className="btn btn-primary btn-wide"
              type="button"
              disabled={busy}
              onClick={() => handleAdd(true)}
            >
              {busy ? "Procesando…" : "Continuar al pago"}
            </button>
            <button className="btn btn-ghost btn-wide" type="button" disabled={busy} onClick={() => handleAdd(false)}>
              Agregar al carrito y seguir viendo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
