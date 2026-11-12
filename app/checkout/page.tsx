"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useCart } from "@/context/cart-context"
import { useCAPI, getFbSignals } from "@/lib/use-capi"
import { catalogContentIds } from "@/lib/content-ids"
import { useSiteSettings } from "@/lib/use-site-settings"
import { SHIPPING_COST, parseFreeShippingThreshold } from "@/lib/pricing"
import { Autorizacion, CamposEntrega, OpcionEnvio, ZonaPago, useEntrega } from "@/components/campos-entrega"
import { ENTREGA_EN_LINEA, SOUVENIR_EN_LINEA, WHATSAPP_CLICHE } from "@/lib/entrega"
import { CuentaRegresiva } from "@/components/cuenta-regresiva"
import { Footer } from "@/components/footer"
import { ArrowLeft, CreditCard, Gift, MessageCircle, Minus, Package, Plus, RotateCcw, ShieldCheck, Sparkles, Tag, Trash2, Truck, Zap } from "lucide-react"

const fmt = (n: number) => `$${n.toLocaleString("es-CO")}`

/**
 * Checkout — un solo paso, con la forma del formulario de pedido de Bienestar
 * by Cliché (EasySell): franja de confianza, campos con ícono, ciudad en
 * selector (llena el departamento), envío prioritario, zona de pago segura y
 * botón pegado abajo. Arriba, la cuenta regresiva contra la fecha real de
 * Navidad; al lado, "Incluido en tu pedido", "Lo que pasa después" y las
 * dudas por WhatsApp. El pago sigue siendo el de siempre: /api/checkout crea
 * la preferencia de Mercado Pago (con cupón y cédula, que el banco pide).
 */
export default function CheckoutPage() {
  const { items, removeItem, updateQuantity } = useCart()
  const { track } = useCAPI()
  const siteSettings = useSiteSettings()
  // Datos de entrega: los mismos campos y reglas del formulario de la ficha.
  const entrega = useEntrega("ck")
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState("")
  const [backUrl, setBackUrl] = useState("/catalogo")
  // Cupón: se guarda tipo+valor y el monto se DERIVA del subtotal vigente, así
  // cambiar cantidades recalcula el descuento igual que el servidor.
  const [cuponAbierto, setCuponAbierto] = useState(false)
  const [couponCode, setCouponCode] = useState("")
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [appliedDiscount, setAppliedDiscount] = useState<{ type: string; value: number } | null>(null)
  const [appliedCode, setAppliedCode] = useState<string | null>(null)
  const [livePrices, setLivePrices] = useState<Record<string, number>>({})

  // Precios VIGENTES desde la BD, por si cambiaron después de que el ítem entró
  // al carrito. El servidor ya cobra el precio real; esto alinea lo que se ve.
  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data: Array<{ id: string; price: number }>) => {
        if (!Array.isArray(data)) return
        const m: Record<string, number> = {}
        for (const p of data) if (p?.id) m[p.id] = p.price
        setLivePrices(m)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const stored = sessionStorage.getItem("checkout-back-url")
    if (stored) setBackUrl(stored)
    else if (document.referrer && !document.referrer.includes("/checkout")) {
      try {
        const u = new URL(document.referrer)
        if (u.origin === window.location.origin) setBackUrl(u.pathname + u.search)
      } catch {}
    }
  }, [])

  // Precio a mostrar: unidades → precio vigente de la BD; kits (id con "::") →
  // su precio fijo de tier. Así la pantalla coincide con lo que cobra el servidor.
  const priceOf = (it: { product: { id: string; price: number } }) =>
    it.product.id.includes("::") ? it.product.price : (livePrices[it.product.id] ?? it.product.price)
  const subtotal = items.reduce((s, i) => s + priceOf(i) * i.quantity, 0)
  const FREE_SHIPPING = parseFreeShippingThreshold(siteSettings.free_shipping_threshold)
  // Producto de prueba de pagos: exento de envío (total exacto = su precio).
  const onlyTestProduct = items.length > 0 && items.every((i) => i.product.slug === "prueba")
  const freeShipping = subtotal >= FREE_SHIPPING || onlyTestProduct
  const envio = freeShipping ? 0 : subtotal > 0 ? SHIPPING_COST : 0
  // Réplica de la fórmula del servidor: el descuento aplica SOLO a productos.
  const descuento = appliedDiscount
    ? Math.min(appliedDiscount.type === "percentage" ? Math.round((subtotal * appliedDiscount.value) / 100) : appliedDiscount.value, subtotal)
    : 0
  const total = Math.max(0, subtotal - descuento) + envio
  // Los kits personalizados llegan en su caja: se menciona solo si hay uno.
  const llevaKit = items.some((i) => i.pack || i.product.id.includes("::"))

  const valid = entrega.valido && items.length > 0

  async function aplicarCupon() {
    if (!couponCode.trim()) return
    setCouponLoading(true); setCouponMsg(null)
    try {
      const res = await fetch("/api/discount/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, email: entrega.form.email, subtotal }),
      })
      const data = await res.json()
      if (data.valid) {
        setAppliedDiscount({ type: data.type, value: Number(data.value) || 0 })
        setAppliedCode(couponCode.toUpperCase().trim())
        setCouponMsg({ ok: true, text: `Descuento aplicado: ${data.type === "percentage" ? `${data.value}%` : fmt(data.value)}` })
      } else {
        setAppliedDiscount(null); setAppliedCode(null)
        setCouponMsg({ ok: false, text: data.error || "Código inválido" })
      }
    } catch {
      setCouponMsg({ ok: false, text: "No pudimos validar el código" })
    } finally {
      setCouponLoading(false)
    }
  }

  async function pagar() {
    if (!valid) { entrega.marcarTodo(); return }
    setPaying(true); setPayError("")
    // ── Meta Pixel + CAPI: AddPaymentInfo (datos completos, va a pagar) ──
    track({
      event_name: "AddPaymentInfo",
      custom_data: {
        currency: "COP",
        value: total,
        content_ids: catalogContentIds(items.map((i) => ({ id: i.product.id, components: i.pack?.components }))),
        content_type: "product",
        num_items: items.reduce((n, i) => n + i.quantity, 0),
      },
      user_data: { raw_email: entrega.form.email.trim(), ...(entrega.form.telefono.trim() && { raw_phone: entrega.form.telefono.trim() }) },
    })
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) =>
            i.pack
              ? { type: "pack", tier: i.pack.tier, quantity: i.quantity, name: i.product.name, components: i.pack.components.map((c) => ({ product_id: c.product_id, quantity: c.quantity })) }
              : { product_id: i.product.id, quantity: i.quantity, unit_price: priceOf(i), name: i.product.name },
          ),
          total,
          ...entrega.datosPedido(),
          discount_code: appliedCode,
          discount_amount: descuento,
          fb_signals: getFbSignals(),
        }),
      })
      const data = await res.json()
      if (data.url) { window.location.href = data.url; return }
      if (res.status === 400 && appliedCode && /c[oó]digo/i.test(data.error ?? "")) {
        // El servidor rechazó el CUPÓN: se retira para que el total vuelva a
        // coincidir con lo que se cobraría, y se avisa junto al botón.
        setAppliedDiscount(null); setAppliedCode(null)
        setCouponMsg({ ok: false, text: data.error })
        setPayError(`${data.error} El total se actualizó sin el descuento.`)
      } else {
        setPayError(data.error || "No pudimos iniciar el pago. Intenta de nuevo.")
      }
    } catch {
      setPayError("Sin conexión. Revisa tu internet e intenta de nuevo.")
    }
    setPaying(false)
  }

  if (items.length === 0) {
    return (
      <>
        <main className="ck-pagina">
          <div className="checkout-empty">
            <h1 className="ck-titulo">Tu carrito está vacío</h1>
            <p>Descubre nuestros aromas y encuentra el que va con tu espacio o tu marca.</p>
            <Link className="cod-cta ck-vacio-cta" href="/catalogo">Ir a la tienda</Link>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <main className="ck-pagina">
        <div className="ck-easy">
          <div className="ck-arriba">
            <Link href="/" aria-label="Cliché — Inicio">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo-cliche.png" alt="Cliché" className="ck-logo" />
            </Link>
            <Link href={backUrl} className="ck-volver"><ArrowLeft size={14} aria-hidden="true" /> Seguir comprando</Link>
          </div>
          <CuentaRegresiva />
          <h1 className="ck-titulo">Estás a un paso de tu aroma</h1>
          {/* Franja de confianza, la misma del formulario de pedido. */}
          <div className="cod-sello ck-sello">
            <ul>
              <li><Truck size={18} aria-hidden="true" /><span>Envío a toda Colombia</span></li>
              <li><ShieldCheck size={18} aria-hidden="true" /><span>Pago 100% seguro</span></li>
              <li><Sparkles size={18} aria-hidden="true" /><span>Hecho en Colombia</span></li>
            </ul>
          </div>

          <div className="ck-grid">
            {/* ── Columna lateral en escritorio. En celular se "deshace"
                 (display:contents): el pedido va arriba y lo que pasa después
                 y las dudas quedan debajo del botón de pagar. ── */}
            <aside className="ck-lado">
              <section className="ck-pedido" aria-labelledby="ck-t-pedido">
                <h2 id="ck-t-pedido">Tu pedido</h2>
                <ul className="ck-items">
                  {items.map((item) => (
                    <li key={item.product.id} className="cod-item ck-item">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.product.image_url || item.pack?.components[0]?.image_url || ""} alt="" width={52} height={60} />
                      <div>
                        <b>{item.product.name}</b>
                        {item.pack
                          ? <small>{item.pack.components.map((c) => `${c.name} ×${c.quantity}`).join(" · ")}</small>
                          : <small>{fmt(priceOf(item))} c/u</small>}
                        <span className="ck-qty">
                          <button type="button" aria-label={`Una menos de ${item.product.name}`} onClick={() => updateQuantity(item.product.id, Math.max(1, item.quantity - 1))}><Minus size={13} /></button>
                          <span aria-live="polite">{item.quantity}</span>
                          <button type="button" aria-label={`Una más de ${item.product.name}`} disabled={item.quantity >= item.product.stock} onClick={() => updateQuantity(item.product.id, item.quantity + 1)}><Plus size={13} /></button>
                          <button type="button" className="ck-quitar" aria-label={`Quitar ${item.product.name} del carrito`} title="Quitar del carrito" onClick={() => removeItem(item.product.id)}><Trash2 size={14} /></button>
                        </span>
                      </div>
                      <strong>{fmt(priceOf(item) * item.quantity)}</strong>
                    </li>
                  ))}
                </ul>
                <div className="ck-gratis">
                  <span>{freeShipping ? <>¡Tu envío es <b>GRATIS</b>!</> : <>Te faltan <b>{fmt(FREE_SHIPPING - subtotal)}</b> para tu envío gratis</>}</span>
                  <div><i style={{ width: `${Math.min(100, (subtotal / FREE_SHIPPING) * 100)}%` }} /></div>
                </div>
                {/* Cupón: plegado, para que no distraiga a quien no tiene uno. */}
                <div className="ck-cupon">
                  {!cuponAbierto && !appliedCode ? (
                    <button type="button" className="ck-cupon-abrir" onClick={() => setCuponAbierto(true)}><Tag size={14} aria-hidden="true" /> ¿Tienes un código de descuento?</button>
                  ) : (
                    <div className="ck-cupon-fila">
                      <label htmlFor="ck-cupon" className="cod-oculto">Código de descuento</label>
                      <input id="ck-cupon" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Tu código" autoCapitalize="characters" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); aplicarCupon() } }} />
                      <button type="button" onClick={aplicarCupon} disabled={couponLoading || !couponCode.trim()}>{couponLoading ? "…" : "Aplicar"}</button>
                    </div>
                  )}
                  {couponMsg && <p className={`account-msg ${couponMsg.ok ? "is-ok" : "is-error"}`} role="status">{couponMsg.text}</p>}
                </div>
                <div className="cod-resumen" aria-live="polite">
                  <div><span>Subtotal</span><strong>{fmt(subtotal)}</strong></div>
                  {descuento > 0 && <div className="cod-desc"><span><Tag size={13} aria-hidden="true" /> Descuento {appliedCode}</span><strong>−{fmt(descuento)}</strong></div>}
                  <div><span>Envío · despacho prioritario</span><strong>{freeShipping ? "Gratis" : fmt(envio)}</strong></div>
                  <div className="cod-total"><span>Total</span><strong>{fmt(total)}</strong></div>
                </div>
                {/* Lo que va en la caja, sin valores tachados ni "bonos" inflados. */}
                <div className="ck-incluye">
                  <span className="ck-incluye-titulo">Incluido en tu pedido</span>
                  <ul>
                    {SOUVENIR_EN_LINEA && <li><Gift size={16} aria-hidden="true" /><span>Souvenir de regalo en tu caja</span></li>}
                    <li><Zap size={16} aria-hidden="true" /><span>Despacho prioritario: llega en {ENTREGA_EN_LINEA}</span></li>
                    {llevaKit && <li><Package size={16} aria-hidden="true" /><span>Tu kit llega armado en su caja</span></li>}
                    <li><RotateCcw size={16} aria-hidden="true" /><span>Garantía de <Link href="/terminos" target="_blank">30 días</Link></span></li>
                  </ul>
                </div>
              </section>

              <section className="ck-despues" aria-labelledby="ck-t-despues">
                <h2 id="ck-t-despues">Lo que pasa después</h2>
                <ol>
                  <li><b>Pagas seguro</b><small>Tarjeta, PSE o Nequi en Mercado Pago. La confirmación llega a tu correo.</small></li>
                  <li><b>Te escribimos por WhatsApp</b><small>Para confirmar la dirección y coordinar la entrega.</small></li>
                  <li><b>Llega a tu puerta</b><small>En {ENTREGA_EN_LINEA}{SOUVENIR_EN_LINEA ? ", con tu souvenir de regalo" : ""}.</small></li>
                </ol>
              </section>

              <section className="ck-dudas" aria-labelledby="ck-t-dudas">
                <MessageCircle size={22} aria-hidden="true" />
                <div>
                  <h2 id="ck-t-dudas">¿Tienes dudas antes de pagar?</h2>
                  <p>Escríbenos y te ayudamos a elegir o a terminar tu pedido.</p>
                  <a href={`https://wa.me/${WHATSAPP_CLICHE}?text=${encodeURIComponent("¡Hola Cliché! Tengo una duda antes de pagar mi pedido")}`} target="_blank" rel="noreferrer">Escribir por WhatsApp · 322 374 5187</a>
                </div>
              </section>
            </aside>

            {/* ── Datos de entrega y pago ── */}
            <form className="ck-datos" onSubmit={(e) => { e.preventDefault(); pagar() }} noValidate aria-labelledby="ck-t-datos">
              <h2 id="ck-t-datos">Datos de entrega</h2>
              <CamposEntrega e={entrega} conNotas />

              <OpcionEnvio gratis={freeShipping} costo={envio} />

              <Autorizacion e={entrega} />

              <ZonaPago />

              <div className="cod-foot ck-foot">
                {payError && <p className="account-msg is-error" role="alert">{payError}</p>}
                {!payError && entrega.algoTocado && !valid && (
                  <p className="account-msg is-error" role="alert">Revisa los campos marcados.</p>
                )}
                <button type="submit" className="cod-cta" disabled={paying}>
                  <CreditCard size={19} aria-hidden="true" />
                  <span className="cod-cta-txt">
                    <span>{paying ? "Te llevamos al pago…" : `Pagar en línea - ${fmt(total)}`}</span>
                    {!paying && <small>{SOUVENIR_EN_LINEA ? `Souvenir de regalo · llega en ${ENTREGA_EN_LINEA.replace(" a ", "-")}` : `Tarjeta, PSE o Nequi · llega en ${ENTREGA_EN_LINEA}`}</small>}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
