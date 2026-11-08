"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Building2, House, IdCard, Lock, Mail, Map as MapIcon, MapPin, PenLine, Phone, User, type LucideIcon } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { CIUDADES_PRINCIPALES, CIUDADES_RESTO, DEPARTAMENTOS, OTRA_CIUDAD, ciudadPorClave, claveCiudad, enLista, etiquetaCiudad } from "@/lib/ciudades-co"
import { ENTREGA_EN_LINEA } from "@/lib/entrega"

/*
 * Datos de entrega con la forma del formulario de pedido (EasySell): campos
 * con ícono y el nombre adentro, ciudad en selector que llena el
 * departamento, autorización de datos y zona de pago segura. Los comparten
 * el checkout y el formulario emergente de la ficha, así piden y validan
 * exactamente lo mismo.
 */

export type CampoEntrega = "nombre" | "telefono" | "email" | "documento" | "departamento" | "ciudad" | "direccion" | "barrio" | "notas"
/** Orden de los campos para llevar el foco al primero con error. */
const ORDEN = ["nombre", "telefono", "email", "documento", "departamento", "ciudad", "direccion", "accepted"]

export function useEntrega(prefijo: string) {
  const { user } = useAuth()
  const [form, setForm] = useState<Record<CampoEntrega, string>>({ nombre: "", telefono: "", email: "", documento: "", departamento: "", ciudad: "", direccion: "", barrio: "", notas: "" })
  // "Otra ciudad o municipio": aparecen el departamento y el municipio a mano.
  const [otraCiudad, setOtraCiudad] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  // Ley 1581/Decreto 1377: la autorización de tratamiento de datos debe ser
  // previa y expresa — sin marcar el checkbox no se puede pagar.
  const [accepted, setAccepted] = useState(false)

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

  const set = (k: CampoEntrega) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }))

  // Selector de ciudad: la opción elegida llena ciudad y departamento juntos.
  const ciudadElegida = enLista(form.ciudad, form.departamento)
  const valorCiudad = otraCiudad ? OTRA_CIUDAD : ciudadElegida ? claveCiudad(ciudadElegida) : ""
  const elegirCiudad = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value
    const c = v === OTRA_CIUDAD ? undefined : ciudadPorClave(v)
    setOtraCiudad(v === OTRA_CIUDAD)
    setForm((f) => ({ ...f, ciudad: c?.ciudad || "", departamento: c?.departamento || "" }))
    if (v === OTRA_CIUDAD) window.setTimeout(() => document.getElementById(`${prefijo}-departamento`)?.focus(), 30)
  }

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
  const valido = Object.keys(errores).length === 0
  const errorDe = (k: string) => (touched[k] && errores[k]) || ""
  const algoTocado = Object.values(touched).some(Boolean)

  // Marca todo y lleva el foco al primer campo con error.
  const marcarTodo = () => {
    setTouched(Object.fromEntries(ORDEN.map((k) => [k, true])))
    const primero = ORDEN.find((k) => errores[k])
    if (primero) window.setTimeout(() => document.getElementById(`${prefijo}-${primero}`)?.focus(), 30)
  }

  // Lo que viaja al pedido (/api/checkout), como lo lee quien despacha: la
  // dirección con el barrio y la ciudad con su departamento.
  const datosPedido = () => ({
    email: form.email.trim(),
    customer_name: form.nombre.trim(),
    customer_phone: form.telefono.trim(),
    customer_id_number: form.documento.trim() || null,
    shipping_address: {
      address: `${form.direccion.trim()}${form.barrio.trim() ? ` · ${form.barrio.trim()}` : ""}`,
      city: form.ciudad.trim(),
      department: form.departamento,
      notes: form.notas.trim() || null,
    },
  })

  return { prefijo, form, set, blur, otraCiudad, valorCiudad, elegirCiudad, accepted, setAccepted, touched, errores, valido, errorDe, algoTocado, marcarTodo, datosPedido, emailFijo: !!user?.email }
}

export type Entrega = ReturnType<typeof useEntrega>

/**
 * Los campos, en el orden del formulario: nombre, celular, correo, cédula,
 * ciudad (y departamento/municipio si es otra), dirección, barrio y, si se
 * pide, notas. Se INVOCAN como funciones (no como componentes) para que el
 * input no se remonte en cada tecla y pierda el foco.
 */
export function CamposEntrega({ e, conNotas = false }: { e: Entrega; conNotas?: boolean }) {
  const p = e.prefijo
  const envoltorio = (k: string, label: string, Icono: LucideIcon, control: React.ReactNode, opts: { pista?: string; visible?: boolean; area?: boolean } = {}) => (
    <div className={`cod-campo ${e.errorDe(k) ? "has-error" : ""}`}>
      <label htmlFor={`${p}-${k}`} className={opts.visible ? undefined : "cod-oculto"}>{label}</label>
      <div className={`cod-input${opts.area ? " cod-input-area" : ""}`}>
        <span className="cod-ico" aria-hidden="true"><Icono size={17} /></span>
        {control}
      </div>
      {e.errorDe(k) ? <em id={`${p}-${k}-msg`}>{e.errorDe(k)}</em> : opts.pista ? <em id={`${p}-${k}-msg`} className="cod-pista">{opts.pista}</em> : null}
    </div>
  )
  const campo = (k: CampoEntrega, label: string, Icono: LucideIcon, props: React.InputHTMLAttributes<HTMLInputElement> = {}, opts: { pista?: string } = {}) =>
    envoltorio(k, label, Icono, (
      <input
        id={`${p}-${k}`}
        value={e.form[k]}
        onChange={e.set(k)}
        onBlur={e.blur(k)}
        placeholder={label}
        aria-invalid={!!e.errorDe(k)}
        aria-describedby={e.errorDe(k) || opts.pista ? `${p}-${k}-msg` : undefined}
        {...props}
      />
    ), opts)

  return (
    <>
      <div className="cod-campos">
        {campo("nombre", "Nombre completo *", User, { autoComplete: "name", maxLength: 120 })}
        {campo("telefono", "Celular (WhatsApp) *", Phone, { type: "tel", inputMode: "tel", autoComplete: "tel", maxLength: 30 })}
        {campo("email", "Correo electrónico *", Mail, { type: "email", autoComplete: "email", maxLength: 120, readOnly: e.emailFijo }, { pista: "Ahí llegan tu confirmación y tu factura" })}
        {campo("documento", "Cédula o NIT *", IdCard, { inputMode: "numeric", maxLength: 20 }, { pista: "El banco la pide para aprobar tu pago" })}
        {/* Ciudad: selector con las principales primero; "otra" abre dos campos. */}
        {envoltorio(e.otraCiudad ? "ciudad-lista" : "ciudad", "Ciudad o municipio", Building2, (
          <select
            id={e.otraCiudad ? `${p}-ciudad-lista` : `${p}-ciudad`}
            className={e.valorCiudad ? undefined : "is-vacio"}
            value={e.valorCiudad}
            onChange={e.elegirCiudad}
            onBlur={e.otraCiudad ? undefined : e.blur("ciudad")}
            aria-invalid={!e.otraCiudad && !!e.errorDe("ciudad")}
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
        {e.otraCiudad && (
          <div className="cod-otra-ciudad">
            {envoltorio("departamento", "Departamento", MapIcon, (
              <select id={`${p}-departamento`} className={e.form.departamento ? undefined : "is-vacio"} value={e.form.departamento} onChange={e.set("departamento")} onBlur={e.blur("departamento")} autoComplete="address-level1" aria-invalid={!!e.errorDe("departamento")}>
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
      {conNotas && envoltorio("notas", "Notas para tu pedido (opcional)", PenLine, (
        <textarea id={`${p}-notas`} rows={2} maxLength={500} value={e.form.notas} onChange={e.set("notas")} placeholder="Ej.: horario para recibir o un mensaje para la tarjeta" />
      ), { visible: true, area: true })}
    </>
  )
}

/** Envío prioritario marcado (como la opción de envío de EasySell). */
export function OpcionEnvio({ gratis, costo }: { gratis: boolean; costo: number }) {
  return (
    <div className="cod-envio">
      <span className="cod-envio-titulo">Opciones de envío</span>
      <div className="cod-envio-op">
        <span className="cod-envio-radio" aria-hidden="true" />
        <span>Envío prioritario · llega en {ENTREGA_EN_LINEA}</span>
        <strong>{gratis ? "Gratis" : `$${costo.toLocaleString("es-CO")}`}</strong>
      </div>
    </div>
  )
}

/** Autorización de datos (Ley 1581), obligatoria para pagar. */
export function Autorizacion({ e }: { e: Entrega }) {
  return (
    <label className={`cod-legal ${e.touched.accepted && !e.accepted ? "has-error" : ""}`}>
      <input id={`${e.prefijo}-accepted`} type="checkbox" checked={e.accepted} onChange={(ev) => e.setAccepted(ev.target.checked)} />
      <span>Autorizo el <Link href="/privacidad" target="_blank">tratamiento de mis datos personales</Link> y acepto los <Link href="/terminos" target="_blank">términos y condiciones</Link>.</span>
    </label>
  )
}

/** Zona de pago segura con los medios que recibe Mercado Pago. */
export function ZonaPago() {
  return (
    <div className="cod-pago">
      <div className="cod-pago-marcas" aria-label="Medios de pago: Visa, Mastercard, PSE y Nequi">
        <span className="cod-marca cod-visa">VISA</span>
        <span className="cod-marca cod-mc" aria-hidden="true"><i /><i /></span>
        <span className="cod-marca cod-pse">PSE</span>
        <span className="cod-marca cod-nequi">Nequi</span>
      </div>
      <p><Lock size={16} aria-hidden="true" /><span><b>Zona de pago segura</b><small>Tarjeta, PSE o Nequi · procesado por Mercado Pago</small></span></p>
    </div>
  )
}
