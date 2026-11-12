"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { useCAPI, generateEventId, getFbSignals } from "@/lib/use-capi"
import { DEFAULT_WHATSAPP, waDisplay, waHref } from "@/components/landing-maqueta/parts"
import {
  BUSINESS_TYPES,
  LIMITS,
  NEED_OPTIONS,
  ORIGIN_PARAMS,
  ORIGIN_STORAGE_KEY,
  ORIGIN_TTL_MS,
  QUANTITY_OPTIONS,
  WHEN_OPTIONS,
  isValidEmail,
  normalizeCoMobile,
  type LeadOrigin,
  type NeedOption,
} from "@/lib/b2b-leads"

/**
 * Piezas interactivas de la landing B2B /empresas (marcado y clases de la
 * maqueta de Cliché; estilos en ./empresas.css): captura del origen al
 * aterrizar, ViewContent, enlaces de WhatsApp (evento Contact), botones que
 * llevan al formulario preseleccionando la necesidad, el formulario de
 * cotización (Lead navegador + servidor con el mismo event_id, SOLO cuando el
 * servidor guardó el contacto) y la barra fija.
 */

const CONTENT_NAME = "Cliché para empresas"
export const WA_COTIZAR_TEXT = "Hola, quiero cotizar un aroma para mi negocio"
const NEED_EVENT = "cliche:b2b-need"

// ── Origen (primer toque) ────────────────────────────────────────────────────

function readStoredOrigin(): LeadOrigin | null {
  try {
    const raw = localStorage.getItem(ORIGIN_STORAGE_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as LeadOrigin
    const at = o.landed_at ? Date.parse(o.landed_at) : NaN
    if (!Number.isFinite(at) || Date.now() - at > ORIGIN_TTL_MS) return null
    return o
  } catch {
    return null
  }
}

/** Guarda el primer toque al aterrizar (UTM, ids de clic, referrer, página y
 *  fecha). Si ya hay uno vigente, se conserva: el contacto se atribuye al
 *  anuncio que trajo a la persona la primera vez. */
function captureOrigin(): LeadOrigin {
  const stored = readStoredOrigin()
  if (stored) return stored
  const o: LeadOrigin = {}
  try {
    const q = new URLSearchParams(window.location.search)
    for (const k of ORIGIN_PARAMS) {
      const v = q.get(k)
      if (v) o[k] = v.slice(0, 300)
    }
    if (document.referrer) o.referrer = document.referrer.slice(0, 500)
    o.landing_page = (window.location.pathname + window.location.search).slice(0, 500)
    o.landed_at = new Date().toISOString()
    localStorage.setItem(ORIGIN_STORAGE_KEY, JSON.stringify(o))
  } catch { /* almacenamiento bloqueado: se usa lo de esta visita */ }
  return o
}

/** Número oficial fijo (lib/entrega); el campo del panel se ignora. */
function useWaNumber(): string {
  return DEFAULT_WHATSAPP
}

/** Desplaza al formulario (respeta el scroll suave de Lenis si está activo). */
function scrollToForm() {
  const el = document.getElementById("cotizar")
  if (!el) return
  const lenis = (window as unknown as { __lenis?: { scrollTo: (t: HTMLElement) => void } }).__lenis
  if (lenis) lenis.scrollTo(el)
  else el.scrollIntoView({ behavior: "smooth", block: "start" })
}

// ── Seguimiento al cargar ────────────────────────────────────────────────────

export function EmpresasTracker() {
  const { track } = useCAPI()
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) return
    fired.current = true
    captureOrigin()
    track({ event_name: "ViewContent", custom_data: { content_name: CONTENT_NAME } })
  }, [track])
  return null
}

// ── Enlaces ──────────────────────────────────────────────────────────────────

/** Enlace de WhatsApp con el mensaje de cotización armado; dispara Contact. */
export function WaLink({
  className,
  children,
  text = WA_COTIZAR_TEXT,
  tabIndex,
  style,
}: {
  className?: string
  children: ReactNode
  text?: string
  tabIndex?: number
  style?: React.CSSProperties
}) {
  const num = useWaNumber()
  const { track } = useCAPI()
  return (
    <a
      href={waHref(num, text)}
      target="_blank"
      rel="noopener noreferrer"
      tabIndex={tabIndex}
      className={className}
      style={style}
      onClick={() => track({ event_name: "Contact", custom_data: { content_name: CONTENT_NAME } })}
    >
      {children}
    </a>
  )
}

/** Texto del número de WhatsApp vigente ("322 374 5187"), del panel admin. */
export function WaNumberText() {
  return <>{waDisplay(useWaNumber())}</>
}

/** Enlace a #cotizar que, si trae `need`, preselecciona esa opción. */
export function CotizarLink({
  need,
  className,
  children,
  tabIndex,
}: {
  need?: NeedOption["key"]
  className?: string
  children: ReactNode
  tabIndex?: number
}) {
  return (
    <a
      href="#cotizar"
      tabIndex={tabIndex}
      className={className}
      onClick={(e) => {
        e.preventDefault()
        if (need) window.dispatchEvent(new CustomEvent(NEED_EVENT, { detail: need }))
        scrollToForm()
        history.replaceState(null, "", "#cotizar")
      }}
    >
      {children}
    </a>
  )
}

// ── Barra fija ───────────────────────────────────────────────────────────────

/** Aparece al pasar los botones del héroe y se esconde sobre el formulario
 *  (allí ya están los dos caminos de contacto). Como en la maqueta, en todos
 *  los tamaños de pantalla. */
export function StickyBar() {
  const [on, setOn] = useState(false)
  useEffect(() => {
    let tick = false
    const check = () => {
      tick = false
      const hero = document.getElementById("hero-ctas")
      const form = document.getElementById("cotizar")
      if (!hero || !form) return
      const pasado = hero.getBoundingClientRect().bottom < 0
      const r = form.getBoundingClientRect()
      const enForm = r.top < window.innerHeight && r.bottom > 0
      setOn(pasado && !enForm)
    }
    const onScroll = () => {
      if (!tick) {
        tick = true
        requestAnimationFrame(check)
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    check()
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [])

  return (
    <div className={`bar${on ? " on" : ""}`} aria-hidden={!on}>
      <div className="bar-in">
        <WaLink className="btn btn-wa" tabIndex={on ? 0 : -1}>WhatsApp</WaLink>
        <CotizarLink className="btn btn-primary" tabIndex={on ? 0 : -1}>Pedir cotización</CotizarLink>
      </div>
    </div>
  )
}

// ── Formulario de cotización ─────────────────────────────────────────────────

type FieldKey = "nombre" | "empresa" | "tipo_negocio" | "ciudad" | "telefono" | "email" | "consentimiento"

/** Campos que acepta /api/empresas/lead (mismos nombres). */
interface FormState {
  necesidad: string
  nombre: string
  empresa: string
  tipo_negocio: string
  ciudad: string
  cantidad: string
  para_cuando: string
  telefono: string
  email: string
  mensaje: string
  consentimiento: boolean
  website: string // honeypot
}

const INITIAL: FormState = {
  necesidad: NEED_OPTIONS[0].value,
  nombre: "",
  empresa: "",
  tipo_negocio: "",
  ciudad: "",
  cantidad: QUANTITY_OPTIONS[0],
  para_cuando: WHEN_OPTIONS[0],
  telefono: "",
  email: "",
  mensaje: "",
  consentimiento: false,
  website: "",
}

// Mismas reglas y mensajes que la maqueta y que el servidor (que revalida todo).
function validate(f: FormState): Partial<Record<FieldKey, string>> {
  const e: Partial<Record<FieldKey, string>> = {}
  if (f.nombre.trim().length < 2) e.nombre = "Escribe tu nombre."
  if (f.empresa.trim().length < 2) e.empresa = "Escribe el nombre de tu empresa."
  if (!f.tipo_negocio) e.tipo_negocio = "Elige el tipo de negocio."
  if (f.ciudad.trim().length < 2) e.ciudad = "Escribe tu ciudad."
  if (!normalizeCoMobile(f.telefono)) e.telefono = "Escribe un celular de 10 dígitos que empiece por 3."
  if (f.email.trim() && !isValidEmail(f.email)) e.email = "Revisa el correo."
  if (!f.consentimiento) e.consentimiento = "Necesitamos tu autorización para contactarte."
  return e
}

const FIELD_ORDER: FieldKey[] = ["nombre", "empresa", "tipo_negocio", "ciudad", "telefono", "email", "consentimiento"]

export function LeadForm() {
  const { track } = useCAPI()
  const waNum = useWaNumber()
  const [f, setF] = useState<FormState>(INITIAL)
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [touched, setTouched] = useState(false)
  const [sending, setSending] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null) // resumen enviado
  const doneRef = useRef<HTMLHeadingElement>(null)

  // Botones "Cotizar mi aroma / Cotizar regalos" preseleccionan la necesidad.
  useEffect(() => {
    const onNeed = (ev: Event) => {
      const key = (ev as CustomEvent<string>).detail
      const opt = NEED_OPTIONS.find((n) => n.key === key)
      if (opt) setF((s) => ({ ...s, necesidad: opt.value }))
    }
    window.addEventListener(NEED_EVENT, onNeed)
    return () => window.removeEventListener(NEED_EVENT, onNeed)
  }, [])

  useEffect(() => {
    if (done) doneRef.current?.focus()
  }, [done])

  const set = useCallback(<K extends keyof FormState>(k: K, v: FormState[K]) => {
    setF((s) => ({ ...s, [k]: v }))
  }, [])

  // Tras el primer intento, los errores se corrigen en vivo.
  useEffect(() => {
    if (touched) setErrors(validate(f))
  }, [f, touched])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (sending) return
    setTouched(true)
    setServerError(null)
    const errs = validate(f)
    setErrors(errs)
    const first = FIELD_ORDER.find((k) => errs[k])
    if (first) {
      document.getElementById(`l-${first}`)?.focus()
      return
    }

    setSending(true)
    const eventId = generateEventId()
    const { fbc, fbp } = getFbSignals()
    const telefono = normalizeCoMobile(f.telefono)!
    try {
      const res = await fetch("/api/empresas/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...f,
          telefono,
          email: f.email.trim(),
          origen: captureOrigin(),
          fbc,
          fbp,
          event_id: eventId,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data?.fields) setErrors(data.fields)
        setServerError(data?.error || "No pudimos enviar tu solicitud. Intenta de nuevo o escríbenos por WhatsApp.")
        return
      }

      // Lead por navegador (Pixel) y servidor (CAPI) con el MISMO event_id;
      // el servidor hashea correo y teléfono (Advanced Matching).
      void track({
        event_name: "Lead",
        event_id: eventId,
        custom_data: { content_name: CONTENT_NAME },
        user_data: {
          ...(f.email.trim() ? { raw_email: f.email.trim().toLowerCase() } : {}),
          raw_phone: `57${telefono}`,
        },
      })

      const lineas = [
        `Hola, soy ${f.nombre.trim()} de ${f.empresa.trim()}.`,
        `Necesito: ${f.necesidad}.`,
        `Negocio: ${f.tipo_negocio} · ${f.ciudad.trim()}.`,
        `Cantidad: ${f.cantidad} · Para: ${f.para_cuando}.`,
      ]
      if (f.mensaje.trim()) lineas.push(`Detalle: ${f.mensaje.trim()}`)
      setDone(lineas.join("\n"))
    } catch {
      setServerError("Error de conexión. Intenta de nuevo o escríbenos por WhatsApp.")
    } finally {
      setSending(false)
    }
  }

  if (done) {
    return (
      <div className="done">
        <div className="ok" aria-hidden>✓</div>
        <h3 ref={doneRef} tabIndex={-1}>Recibimos tu solicitud</h3>
        <p className="sub">
          Te escribimos por WhatsApp en horario hábil con una propuesta. Si quieres adelantar la conversación, envíanos
          este resumen:
        </p>
        <div className="summary">{done}</div>
        <a
          className="btn btn-wa"
          href={waHref(waNum, done)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track({ event_name: "Contact", custom_data: { content_name: CONTENT_NAME } })}
        >
          Enviar el resumen por WhatsApp
        </a>
      </div>
    )
  }

  const err = (k: FieldKey) =>
    errors[k] ? <span id={`l-${k}-err`} className="err">{errors[k]}</span> : null
  const aria = (k: FieldKey) => ({
    "aria-invalid": errors[k] ? true : undefined,
    "aria-describedby": errors[k] ? `l-${k}-err` : undefined,
  })

  return (
    <form onSubmit={onSubmit} noValidate>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <fieldset>
          <legend>¿Qué necesitas?</legend>
          <div className="opts">
            {NEED_OPTIONS.map((n) => (
              <label key={n.key} className="opt">
                <input
                  type="radio"
                  name="necesidad"
                  value={n.value}
                  checked={f.necesidad === n.value}
                  onChange={() => set("necesidad", n.value)}
                />
                <span>{n.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid2">
          <div className="field">
            <label className="lbl" htmlFor="l-nombre">Tu nombre</label>
            <input id="l-nombre" autoComplete="name" maxLength={LIMITS.nombre} value={f.nombre}
              onChange={(e) => set("nombre", e.target.value)} {...aria("nombre")} />
            {err("nombre")}
          </div>
          <div className="field">
            <label className="lbl" htmlFor="l-empresa">Empresa o marca</label>
            <input id="l-empresa" autoComplete="organization" maxLength={LIMITS.empresa} value={f.empresa}
              onChange={(e) => set("empresa", e.target.value)} {...aria("empresa")} />
            {err("empresa")}
          </div>
          <div className="field">
            <label className="lbl" htmlFor="l-tipo_negocio">Tipo de negocio</label>
            <select id="l-tipo_negocio" value={f.tipo_negocio} onChange={(e) => set("tipo_negocio", e.target.value)}
              {...aria("tipo_negocio")}>
              <option value="">Elige</option>
              {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {err("tipo_negocio")}
          </div>
          <div className="field">
            <label className="lbl" htmlFor="l-ciudad">Ciudad</label>
            <input id="l-ciudad" autoComplete="address-level2" maxLength={LIMITS.ciudad} value={f.ciudad}
              onChange={(e) => set("ciudad", e.target.value)} {...aria("ciudad")} />
            {err("ciudad")}
          </div>
          <div className="field">
            <label className="lbl" htmlFor="l-cantidad">Cantidad aproximada</label>
            <select id="l-cantidad" value={f.cantidad} onChange={(e) => set("cantidad", e.target.value)}>
              {QUANTITY_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="lbl" htmlFor="l-para_cuando">¿Para cuándo?</label>
            <select id="l-para_cuando" value={f.para_cuando} onChange={(e) => set("para_cuando", e.target.value)}>
              {WHEN_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="lbl" htmlFor="l-telefono">Celular con WhatsApp</label>
            <input id="l-telefono" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="300 123 4567"
              maxLength={20} value={f.telefono} onChange={(e) => set("telefono", e.target.value)} {...aria("telefono")} />
            {err("telefono")}
          </div>
          <div className="field">
            <label className="lbl" htmlFor="l-email">Correo (opcional)</label>
            <input id="l-email" type="email" autoComplete="email" maxLength={LIMITS.email} value={f.email}
              onChange={(e) => set("email", e.target.value)} {...aria("email")} />
            {err("email")}
          </div>
          <div className="field full">
            <label className="lbl" htmlFor="l-mensaje">Cuéntanos más (opcional)</label>
            <textarea id="l-mensaje" rows={3} maxLength={LIMITS.mensaje} value={f.mensaje}
              onChange={(e) => set("mensaje", e.target.value)}
              placeholder="Espacios, número de tiendas, fechas, lo que imaginas para tu marca…" />
          </div>
        </div>

        {/* Honeypot anti-spam: invisible para personas y lectores de pantalla. */}
        <div aria-hidden className="hp">
          <label htmlFor="l-website">No llenes este campo</label>
          <input id="l-website" tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set("website", e.target.value)} />
        </div>

        {/* "a tratar mis datos" no estaba en la maqueta: la autorización de
            tratamiento la exige la Ley 1581 y es lo que guarda `consentimiento`. */}
        <label className="consent">
          <input id="l-consentimiento" type="checkbox" checked={f.consentimiento}
            onChange={(e) => set("consentimiento", e.target.checked)} {...aria("consentimiento")} />
          <span>
            Autorizo a Cliché S.A.S. a tratar mis datos y contactarme por WhatsApp o correo sobre esta cotización,
            según la <a href="/privacidad" target="_blank" rel="noopener">política de privacidad</a>.
          </span>
        </label>
        {err("consentimiento")}

        {serverError && <p role="alert" className="err-box">{serverError}</p>}

        <button className="btn btn-primary" type="submit" disabled={sending}>
          {sending ? "Enviando…" : "Enviar solicitud"}
        </button>
      </div>
    </form>
  )
}
