"use client"

import { useEffect, useId, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { CreditCard, Gift, RotateCcw, ShieldCheck, Sparkles, Truck, X, Zap } from "lucide-react"
import { useCAPI, getFbSignals } from "@/lib/use-capi"
import { useSiteSettings } from "@/lib/use-site-settings"
import { PRICE_TIERS, SHIPPING_COST, makeVariantId, parseFreeShippingThreshold, tierSavings } from "@/lib/pricing"
import { ENTREGA_EN_LINEA, SOUVENIR_EN_LINEA } from "@/lib/entrega"
import { Autorizacion, CamposEntrega, OpcionEnvio, ZonaPago, useEntrega } from "@/components/campos-entrega"
import type { Product } from "@/lib/supabase"

const fmt = (n: number) => `$${n.toLocaleString("es-CO")}`
const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Formulario de pedido en la misma ficha (como el de Bienestar by Cliché,
 * estilo EasySell): "Comprar ahora" abre esta ventana con el aroma y la
 * presentación elegidos (se puede cambiar aquí), los datos de entrega con la
 * ciudad en selector, el envío prioritario, la zona de pago segura y el botón
 * con el total. Al pagar va directo a Mercado Pago por /api/checkout, la misma
 * ruta del carrito, sin pasar por el carrito.
 *
 * Accesible: role="dialog", foco atrapado, Esc cierra y el fondo no se mueve.
 */
export function PedidoRapido({ abierto, onClose, product, tierId, onTierChange, qty }: {
  abierto: boolean
  onClose: () => void
  product: Product
  tierId: string
  onTierChange: (id: string) => void
  qty: number
}) {
  const uid = useId().replace(/:/g, "")
  const tituloId = `${uid}-titulo`
  const entrega = useEntrega(`pr${uid}`)
  const { track } = useCAPI()
  const siteSettings = useSiteSettings()
  const [montado, setMontado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState("")
  const cajaRef = useRef<HTMLDivElement>(null)
  useEffect(() => setMontado(true), [])

  const tier = PRICE_TIERS.find((t) => t.id === tierId) ?? PRICE_TIERS[0]
  const precio = tier.id === "unit" ? product.price : tier.price
  const subtotal = precio * qty
  const umbral = parseFreeShippingThreshold(siteSettings.free_shipping_threshold)
  const gratis = subtotal >= umbral
  const envio = gratis ? 0 : SHIPPING_COST
  const total = subtotal + envio
  const foto = (Array.isArray(product.image_urls) ? product.image_urls.find(Boolean) : null) || product.image_url || ""
  const nombre = tier.units > 1 ? `${product.name} — Kit x${tier.units}` : product.name

  // Abrir: fondo quieto, foco en la ventana, Esc cierra y Tab no se escapa.
  const cerrarRef = useRef(onClose)
  cerrarRef.current = onClose
  const enviandoRef = useRef(false)
  enviandoRef.current = enviando
  useEffect(() => {
    if (!abierto) return
    const previo = document.activeElement as HTMLElement | null
    const html = document.documentElement
    const overflowPrevio = html.style.overflow
    html.style.overflow = "hidden"
    const lenis = (window as unknown as { __lenis?: { stop: () => void; start: () => void } }).__lenis
    lenis?.stop()
    const t = window.setTimeout(() => cajaRef.current?.focus({ preventScroll: true }), 40)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (!enviandoRef.current) { e.preventDefault(); cerrarRef.current() } return }
      if (e.key !== "Tab" || !cajaRef.current) return
      const focos = Array.from(cajaRef.current.querySelectorAll<HTMLElement>(ENFOCABLES)).filter((el) => el.getClientRects().length > 0)
      if (!focos.length) return
      const primero = focos[0]
      const ultimo = focos[focos.length - 1]
      const activo = document.activeElement
      if (e.shiftKey && (activo === primero || activo === cajaRef.current)) { e.preventDefault(); ultimo.focus() }
      else if (!e.shiftKey && (activo === ultimo || !cajaRef.current.contains(activo))) { e.preventDefault(); primero.focus() }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      window.clearTimeout(t)
      html.style.overflow = overflowPrevio
      lenis?.start()
      document.removeEventListener("keydown", onKey)
      previo?.focus?.()
    }
  }, [abierto])

  const cerrar = () => { if (!enviando) onClose() }

  async function pagar(ev: React.FormEvent) {
    ev.preventDefault()
    if (!entrega.valido) { entrega.marcarTodo(); return }
    setEnviando(true); setError("")
    // ── Meta Pixel + CAPI: AddPaymentInfo (datos completos, va a pagar) ──
    track({
      event_name: "AddPaymentInfo",
      custom_data: { currency: "COP", value: total, content_ids: [product.id], content_type: "product", num_items: qty * tier.units },
      user_data: { raw_email: entrega.form.email.trim(), ...(entrega.form.telefono.trim() && { raw_phone: entrega.form.telefono.trim() }) },
    })
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ product_id: makeVariantId(product.id, tier.id), quantity: qty, unit_price: precio, name: nombre }],
          total,
          ...entrega.datosPedido(),
          fb_signals: getFbSignals(),
        }),
      })
      const data = await res.json()
      if (data.url) { window.location.href = data.url; return }
      setError(data.error || "No pudimos iniciar el pago. Intenta de nuevo.")
    } catch {
      setError("Sin conexión. Revisa tu internet e intenta de nuevo.")
    }
    setEnviando(false)
  }

  if (!montado || !abierto) return null
  return createPortal(
    <div className="cod-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) cerrar() }} data-lenis-prevent>
      <div ref={cajaRef} className="cod-sheet" role="dialog" aria-modal="true" aria-labelledby={tituloId} tabIndex={-1}>
        {/* Franja de confianza: la marca y tres razones, todas ciertas hoy. */}
        <div className="cod-sello">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="cod-sello-logo" src="/images/logo-cliche.png" alt="Cliché" />
          <ul>
            <li><Truck size={18} aria-hidden="true" /><span>Envío a toda Colombia</span></li>
            <li><ShieldCheck size={18} aria-hidden="true" /><span>Pago 100% seguro</span></li>
            <li><Sparkles size={18} aria-hidden="true" /><span>Hecho en Colombia</span></li>
          </ul>
        </div>
        <div className="cod-head">
          <h2 id={tituloId}>Completa tus datos para hacer el pedido</h2>
          <button type="button" className="cod-cerrar" onClick={cerrar} aria-label="Cerrar" disabled={enviando}><X size={20} /></button>
        </div>

        <form className="cod-form" onSubmit={pagar} noValidate>
          <div className="cod-body">
            {/* ── Qué se pide ── */}
            <div className="cod-item">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={foto} alt="" width={52} height={60} />
              <div><b>{product.name}</b><small>{qty > 1 ? `${qty} × ` : ""}{tier.label}{tier.units > 1 ? ` · ${tier.units * qty} frascos` : ""}</small></div>
              <strong>{fmt(subtotal)}</strong>
            </div>

            {/* Presentación: la misma elección de la ficha, cambiable aquí. */}
            {product.slug !== "prueba" && (
              <fieldset className="cod-packs pr-packs">
                <legend className="cod-oculto">Presentación</legend>
                {PRICE_TIERS.map((t) => {
                  const on = t.id === tier.id
                  return (
                    <label key={t.id} className={`cod-pack ${on ? "is-on" : ""}`}>
                      <input type="radio" name={`${uid}-pack`} value={t.id} checked={on} onChange={() => onTierChange(t.id)} className="cod-oculto" />
                      {t.badge && <span className="cod-pack-cinta">{t.badge}</span>}
                      <span className="cod-pack-radio" aria-hidden="true" />
                      <b>{t.label}</b>
                      <strong>{fmt(t.id === "unit" ? product.price : t.price)}</strong>
                      {t.units > 1 ? <small>Ahorras {fmt(tierSavings(t))}</small> : <small>250 ml</small>}
                    </label>
                  )
                })}
              </fieldset>
            )}

            <div className="cod-resumen" aria-live="polite">
              <div><span>Subtotal</span><strong>{fmt(subtotal)}</strong></div>
              <div><span>Envío · despacho prioritario</span><strong>{gratis ? "Gratis" : fmt(envio)}</strong></div>
              <div className="cod-total"><span>Total</span><strong>{fmt(total)}</strong></div>
            </div>

            <CamposEntrega e={entrega} />
            <OpcionEnvio gratis={gratis} costo={envio} />
            <ul className="cod-razones">
              <li><Zap size={20} aria-hidden="true" /><span>Llega en {ENTREGA_EN_LINEA.replace(" a ", "-")}</span></li>
              <li><RotateCcw size={20} aria-hidden="true" /><span>Garantía de 30 días</span></li>
              <li><Gift size={20} aria-hidden="true" /><span>{SOUVENIR_EN_LINEA ? "Souvenir de regalo en tu caja" : "Caja protegida"}</span></li>
            </ul>
            <Autorizacion e={entrega} />
            <ZonaPago />
          </div>

          <div className="cod-foot">
            {error && <p className="account-msg is-error" role="alert">{error}</p>}
            {!error && entrega.algoTocado && !entrega.valido && <p className="account-msg is-error" role="alert">Revisa los campos marcados.</p>}
            <button type="submit" className="cod-cta" disabled={enviando}>
              <CreditCard size={19} aria-hidden="true" />
              <span className="cod-cta-txt">
                <span>{enviando ? "Te llevamos al pago…" : `Pagar en línea - ${fmt(total)}`}</span>
                {!enviando && <small>{SOUVENIR_EN_LINEA ? "Souvenir de regalo · " : ""}llega en {ENTREGA_EN_LINEA.replace(" a ", "-")}</small>}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
