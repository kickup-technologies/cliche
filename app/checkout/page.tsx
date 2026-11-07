"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useCart } from "@/context/cart-context"
import { useAuth } from "@/context/auth-context"
import { useCAPI, getFbSignals } from "@/lib/use-capi"
import { catalogContentIds } from "@/lib/content-ids"
import { useSiteSettings } from "@/lib/use-site-settings"
import { SHIPPING_COST, parseFreeShippingThreshold } from "@/lib/pricing"
import { CIUDADES_PRINCIPALES, CIUDADES_RESTO, DEPARTAMENTOS, OTRA_CIUDAD, ciudadPorClave, claveCiudad, enLista, etiquetaCiudad } from "@/lib/ciudades-co"
import { ENTREGA_EN_LINEA, SOUVENIR_EN_LINEA, WHATSAPP_CLICHE } from "@/lib/entrega"
import { CuentaRegresiva } from "@/components/cuenta-regresiva"
import { Footer } from "@/components/footer"
import {
  ArrowLeft, Building2, CreditCard, Gift, House, IdCard, Lock, Mail, Map as MapIcon, MapPin, MessageCircle,
  Minus, Package, PenLine, Phone, Plus, RotateCcw, ShieldCheck, Sparkles, Tag, Trash2, Truck, User, Zap,
  type LucideIcon,
} from "lucide-react"

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
type CampoForm = "nombre" | "telefono" | "email" | "documento" | "departamento" | "ciudad" | "direccion" | "barrio" | "notas"
/** Orden de los campos para llevar el foco al primero con error. */
const ORDEN = ["nombre", "telefono", "email", "documento", "departamento", "ciudad", "direccion", "accepted"]

export default function CheckoutPage() {
  const { items, removeItem, updateQuantity } = useCart()
  const { user } = useAuth()
  const { track } = useCAPI()
  const siteSettings = useSiteSettings()
  const [form, setForm] = useState<Record<CampoForm, string>>({ nombre: "", telefono: "", email: "", documento: "", departamento: "", ciudad: "", direccion: "", barrio: "", notas: "" })
  // "Otra ciudad o municipio": aparecen el departamento y el municipio a mano.
  const [otraCiudad, setOtraCiudad] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  // Ley 1581/Decreto 1377: la autorización de tratamiento de datos debe ser
  // previa y expresa — sin marcar el checkbox no se puede pagar.
  const [accepted, setAccepted] = useState(false)
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

  // Con sesión: el correo se fija al de la cuenta (los códigos se validan y
  // cuentan contra ESE correo, así el "un solo uso por cuenta" es infalsificable).
  useEffect(() => {
    if (!user) return
    const meta = (user.user_metadata || {}) as Record<string, string | undefined>
    setForm((f) => ({
      ...f,
      email: user.email || f.email,
      nombre: f.nombre || meta.full_name || [meta.first_name, meta.last_name].filter(Boolean).join(" ") || "",
      telefono: f.telefono || meta.phone || "",
    }))
  }, [user])

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

  const set = (k: CampoForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }))

  // Selector de ciudad: la opción elegida llena ciudad y departamento juntos.
  const ciudadElegida = enLista(form.ciudad, form.departamento)
  const valorCiudad = otraCiudad ? OTRA_CIUDAD : ciudadElegida ? claveCiudad(ciudadElegida) : ""
  const elegirCiudad = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value
    const c = v === OTRA_CIUDAD ? undefined : ciudadPorClave(v)
    setOtraCiudad(v === OTRA_CIUDAD)
    setForm((f) => ({ ...f, ciudad: c?.ciudad || "", departamento: c?.departamento || "" }))
    if (v === OTRA_CIUDAD) window.setTimeout(() => document.getElementById("ck-departamento")?.focus(), 30)
  }

  // Validación campo a campo (los mismos mínimos que pedía el checkout anterior).
  const errores = useMemo(() => {
    const e: Record<string, string> = {}
    if (!form.nombre.trim()) e.nombre = "Escribe tu nombre completo"
    if (form.telefono.replace(/\D/g, "").length < 7) e.telefono = "Escribe un celular válido"
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) e.email = "Escribe un correo válido (ahí llega tu factura)"
    // Cédula obligatoria: Mercado Pago la cruza con el banco emisor y sin ella
    // su antifraude bloquea pagos reales (auditoría 2026-08-03). Va en la factura.
    if (form.documento.replace(/\D/g, "").length < 5) e.documento = "Escribe tu cédula o NIT: el banco la pide para aprobar el pago"
    if (form.direccion.trim().length < 5) e.direccion = "Dirección completa de entrega"
    if (otraCiudad) {
      if (!form.departamento) e.departamento = "Elige tu departamento"
      if (form.ciudad.trim().length < 2) e.ciudad = "Escribe tu municipio"
    } else if (!form.ciudad || !form.departamento) e.ciudad = "Elige tu ciudad o municipio"
    if (!accepted) e.accepted = "Necesitamos tu autorización para gestionar el pedido"
    return e
  }, [form, otraCiudad, accepted])
  const valid = Object.keys(errores).length === 0 && items.length > 0
  const errorDe = (k: string) => (touched[k] && errores[k]) || ""

  // Marca todo y lleva el foco al primer campo con error.
  const marcarTodo = () => {
    setTouched(Object.fromEntries(ORDEN.map((k) => [k, true])))
    const primero = ORDEN.find((k) => errores[k])
    if (primero) window.setTimeout(() => document.getElementById(`ck-${primero}`)?.focus(), 30)
  }

  async function aplicarCupon() {
    if (!couponCode.trim()) return
    setCouponLoading(true); setCouponMsg(null)
    try {
      const res = await fetch("/api/discount/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, email: form.email, subtotal }),
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
    if (!valid) { marcarTodo(); return }
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
      user_data: { raw_email: form.email.trim(), ...(form.telefono.trim() && { raw_phone: form.telefono.trim() }) },
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
          email: form.email.trim(),
          discount_code: appliedCode,
          discount_amount: descuento,
          customer_name: form.nombre.trim(),
          customer_phone: form.telefono.trim(),
          customer_id_number: form.documento.trim() || null,
          fb_signals: getFbSignals(),
          // Lo que viaja al pedido, como lo lee quien despacha: la dirección
          // con el barrio y la ciudad con su departamento.
          shipping_address: {
            address: `${form.direccion.trim()}${form.barrio.trim() ? ` · ${form.barrio.trim()}` : ""}`,
            city: form.ciudad.trim(),
            department: form.departamento,
            notes: form.notas.trim() || null,
          },
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

  // Campos con la forma del formulario de pedido (EasySell): ícono a la
  // izquierda y el nombre dentro del campo; la etiqueta queda para el lector
  // de pantalla. Se INVOCAN como función (no como <Campo/>): un componente
  // definido dentro del render se remontaría en cada tecla y perdería el foco.
  const envoltorio = (k: string, label: string, Icono: LucideIcon, control: React.ReactNode, opts: { pista?: string; visible?: boolean; area?: boolean } = {}) => (
    <div className={`cod-campo ${errorDe(k) ? "has-error" : ""}`}>
      <label htmlFor={`ck-${k}`} className={opts.visible ? undefined : "cod-oculto"}>{label}</label>
      <div className={`cod-input${opts.area ? " cod-input-area" : ""}`}>
        <span className="cod-ico" aria-hidden="true"><Icono size={17} /></span>
        {control}
      </div>
      {errorDe(k) ? <em id={`ck-${k}-msg`}>{errorDe(k)}</em> : opts.pista ? <em id={`ck-${k}-msg`} className="cod-pista">{opts.pista}</em> : null}
    </div>
  )
  const campo = (k: CampoForm, label: string, Icono: LucideIcon, props: React.InputHTMLAttributes<HTMLInputElement> = {}, opts: { pista?: string } = {}) =>
    envoltorio(k, label, Icono, (
      <input
        id={`ck-${k}`}
        value={form[k]}
        onChange={set(k)}
        onBlur={blur(k)}
        placeholder={label}
        aria-invalid={!!errorDe(k)}
        aria-describedby={errorDe(k) || opts.pista ? `ck-${k}-msg` : undefined}
        {...props}
      />
    ), opts)

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
                  <a href={`https://wa.me/${WHATSAPP_CLICHE}?text=${encodeURIComponent("¡Hola Cliché! Tengo una duda antes de pagar mi pedido")}`} target="_blank" rel="noreferrer">Escribir por WhatsApp · 312 283 8844</a>
                </div>
              </section>
            </aside>

            {/* ── Datos de entrega y pago ── */}
            <form className="ck-datos" onSubmit={(e) => { e.preventDefault(); pagar() }} noValidate aria-labelledby="ck-t-datos">
              <h2 id="ck-t-datos">Datos de entrega</h2>
              <div className="cod-campos">
                {campo("nombre", "Nombre completo *", User, { autoComplete: "name", maxLength: 120 })}
                {campo("telefono", "Celular (WhatsApp) *", Phone, { type: "tel", inputMode: "tel", autoComplete: "tel", maxLength: 30 })}
                {campo("email", "Correo electrónico *", Mail, { type: "email", autoComplete: "email", maxLength: 120, readOnly: !!user?.email }, { pista: "Ahí llegan tu confirmación y tu factura" })}
                {campo("documento", "Cédula o NIT *", IdCard, { inputMode: "numeric", maxLength: 20 }, { pista: "El banco la pide para aprobar tu pago" })}
                {/* Ciudad: el mismo selector del formulario de pedido. */}
                {envoltorio(otraCiudad ? "ciudad-lista" : "ciudad", "Ciudad o municipio", Building2, (
                  <select
                    id={otraCiudad ? "ck-ciudad-lista" : "ck-ciudad"}
                    className={valorCiudad ? undefined : "is-vacio"}
                    value={valorCiudad}
                    onChange={elegirCiudad}
                    onBlur={otraCiudad ? undefined : blur("ciudad")}
                    aria-invalid={!otraCiudad && !!errorDe("ciudad")}
                  >
                    <option value="" disabled>Ciudad o municipio *</option>
                    <optgroup label="Ciudades principales">
                      {CIUDADES_PRINCIPALES.map((c) => <option key={claveCiudad(c)} value={claveCiudad(c)}>{etiquetaCiudad(c)}</option>)}
                    </optgroup>
                    <optgroup label="¿No está tu ciudad?">
                      <option value={OTRA_CIUDAD}>Otra ciudad o municipio (escríbela)</option>
                    </optgroup>
                    <optgroup label="Más ciudades y municipios">
                      {CIUDADES_RESTO.map((c) => <option key={claveCiudad(c)} value={claveCiudad(c)}>{etiquetaCiudad(c)}</option>)}
                    </optgroup>
                  </select>
                ))}
                {otraCiudad && (
                  <div className="cod-otra-ciudad">
                    {envoltorio("departamento", "Departamento", MapIcon, (
                      <select id="ck-departamento" className={form.departamento ? undefined : "is-vacio"} value={form.departamento} onChange={set("departamento")} onBlur={blur("departamento")} autoComplete="address-level1" aria-invalid={!!errorDe("departamento")}>
                        <option value="" disabled>Departamento *</option>
                        {DEPARTAMENTOS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    ))}
                    {campo("ciudad", "Municipio *", Building2, { autoComplete: "address-level2", maxLength: 60 })}
                  </div>
                )}
                {campo("direccion", "Dirección completa *", MapPin, { autoComplete: "address-line1", maxLength: 160 })}
                {campo("barrio", "Barrio, apto o indicaciones", House, { autoComplete: "address-line2", maxLength: 60 })}
              </div>
              {envoltorio("notas", "Notas para tu pedido (opcional)", PenLine, (
                <textarea id="ck-notas" rows={2} maxLength={500} value={form.notas} onChange={set("notas")} placeholder="Ej.: horario para recibir o un mensaje para la tarjeta" />
              ), { visible: true, area: true })}

              <div className="cod-envio">
                <span className="cod-envio-titulo">Opciones de envío</span>
                <div className="cod-envio-op">
                  <span className="cod-envio-radio" aria-hidden="true" />
                  <span>Envío prioritario · llega en {ENTREGA_EN_LINEA}</span>
                  <strong>{freeShipping ? "Gratis" : fmt(envio)}</strong>
                </div>
              </div>

              <label className={`cod-legal ${touched.accepted && !accepted ? "has-error" : ""}`}>
                <input id="ck-accepted" type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
                <span>Autorizo el <Link href="/privacidad" target="_blank">tratamiento de mis datos personales</Link> y acepto los <Link href="/terminos" target="_blank">términos y condiciones</Link>.</span>
              </label>

              <div className="cod-pago">
                <div className="cod-pago-marcas" aria-label="Medios de pago: Visa, Mastercard, PSE y Nequi">
                  <span className="cod-marca cod-visa">VISA</span>
                  <span className="cod-marca cod-mc" aria-hidden="true"><i /><i /></span>
                  <span className="cod-marca cod-pse">PSE</span>
                  <span className="cod-marca cod-nequi">Nequi</span>
                </div>
                <p><Lock size={16} aria-hidden="true" /><span><b>Zona de pago segura</b><small>Tarjeta, PSE o Nequi · procesado por Mercado Pago</small></span></p>
              </div>

              <div className="cod-foot ck-foot">
                {payError && <p className="account-msg is-error" role="alert">{payError}</p>}
                {!payError && Object.values(touched).some(Boolean) && !valid && (
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
