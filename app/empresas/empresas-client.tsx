"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { CheckCircle2, Loader2, MessageCircle } from "lucide-react"
import { useCAPI, generateEventId, getFbSignals } from "@/lib/use-capi"
import { useSiteSettings } from "@/lib/use-site-settings"
import { cn } from "@/lib/utils"
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
 * Piezas interactivas de la landing B2B /empresas: captura del origen al
 * aterrizar, ViewContent, enlaces de WhatsApp (evento Contact), botones que
 * llevan al formulario preseleccionando la necesidad, el formulario de
 * cotización (Lead navegador + servidor con el mismo event_id) y la barra
 * fija móvil.
 */

const CONTENT_NAME = "Cliché para empresas"
const DEFAULT_WA = "573122838844"
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

function useWaNumber(): string {
  const settings = useSiteSettings()
  const n = settings.whatsapp_number ? String(settings.whatsapp_number).replace(/\D/g, "") : ""
  return n || DEFAULT_WA
}

function waHref(num: string, text: string) {
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`
}

/** Desplaza al formulario (respeta el scroll suave de Lenis si está activo). */
function scrollToForm() {
  const el = document.getElementById("cotizar")
  if (!el) return
  const lenis = (window as unknown as { __lenis?: { scrollTo: (t: HTMLElement, o?: { offset?: number }) => void } }).__lenis
  if (lenis) lenis.scrollTo(el, { offset: -96 })
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

export function WaLink({
  className,
  children,
  text = WA_COTIZAR_TEXT,
  tabIndex,
}: {
  className?: string
  children: ReactNode
  text?: string
  tabIndex?: number
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
      onClick={() => track({ event_name: "Contact", custom_data: { content_name: CONTENT_NAME } })}
    >
      {children}
    </a>
  )
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

// ── Barra fija móvil ─────────────────────────────────────────────────────────

/** Aparece al pasar los botones del héroe y se esconde sobre el formulario
 *  (allí ya están los dos caminos de contacto). Solo en móvil: en escritorio
 *  queda el botón flotante de WhatsApp del sitio. */
export function MobileBar() {
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
    check()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div
      aria-hidden={!on}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-[#2D1A14]/10 bg-white px-4 pt-2.5 shadow-[0_-8px_24px_rgba(45,26,20,0.08)] transition-transform duration-300 md:hidden",
        "pb-[calc(10px+env(safe-area-inset-bottom,0px))]",
        on ? "translate-y-0" : "translate-y-[110%]",
      )}
    >
      <div className="mx-auto flex max-w-6xl gap-2.5">
        <WaLink
          tabIndex={on ? 0 : -1}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1F7A4D] px-3 py-3 text-[15px] font-semibold text-white"
        >
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </WaLink>
        <CotizarLink
          tabIndex={on ? 0 : -1}
          className="flex flex-1 items-center justify-center rounded-xl bg-[#2D1A14] px-3 py-3 text-[15px] font-semibold text-[#FAF8F5]"
        >
          Pedir cotización
        </CotizarLink>
      </div>
    </div>
  )
}

// ── Formulario de cotización ─────────────────────────────────────────────────

type FieldKey = "nombre" | "empresa" | "tipo_negocio" | "ciudad" | "telefono" | "email" | "consentimiento"

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

const inputCls =
  "w-full rounded-[10px] border border-[#2D1A14]/12 bg-white px-3 py-[11px] text-base text-[#2D1A14] outline-none transition-colors placeholder:text-[#2D1A14]/35 focus:border-[#A67163] aria-[invalid=true]:border-[#A67163]"
const labelCls = "text-[13.5px] text-[#2D1A14]/75"
const errCls = "text-[12.5px] text-[#8F5E51]"

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
      <div className="flex flex-col items-start gap-3">
        <CheckCircle2 className="h-12 w-12 text-[#A67163]" aria-hidden />
        <h3 ref={doneRef} tabIndex={-1} className="font-serif text-xl text-[#2D1A14] outline-none">
          Recibimos tu solicitud
        </h3>
        <p className="text-[15px] leading-relaxed text-[#2D1A14]/75">
          Te escribimos por WhatsApp en horario hábil con una propuesta. Si quieres adelantar la conversación, envíanos
          este resumen:
        </p>
        <div className="w-full whitespace-pre-line rounded-xl border border-[#2D1A14]/10 bg-[#FAF8F5] p-3 text-sm text-[#2D1A14]">
          {done}
        </div>
        <a
          href={waHref(waNum, done)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track({ event_name: "Contact", custom_data: { content_name: CONTENT_NAME } })}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1F7A4D] px-5 py-3.5 font-semibold text-white transition-colors hover:bg-[#17633E]"
        >
          <MessageCircle className="h-4 w-4" /> Enviar el resumen por WhatsApp
        </a>
      </div>
    )
  }

  const err = (k: FieldKey) =>
    errors[k] ? (
      <span id={`l-${k}-err`} className={errCls}>
        {errors[k]}
      </span>
    ) : null
  const aria = (k: FieldKey) => ({
    "aria-invalid": errors[k] ? true : undefined,
    "aria-describedby": errors[k] ? `l-${k}-err` : undefined,
  })

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className={cn(labelCls, "mb-2")}>¿Qué necesitas?</legend>
        <div className="flex flex-wrap gap-2">
          {NEED_OPTIONS.map((n) => (
            <label key={n.key} className="relative cursor-pointer">
              <input
                type="radio"
                name="necesidad"
                value={n.value}
                checked={f.necesidad === n.value}
                onChange={() => set("necesidad", n.value)}
                className="peer absolute h-px w-px opacity-0"
              />
              <span className="inline-block rounded-full border border-[#2D1A14]/12 bg-[#FAF8F5] px-3 py-2 text-sm text-[#2D1A14] transition-colors peer-checked:border-[#2D1A14] peer-checked:bg-[#2D1A14] peer-checked:text-[#FAF8F5] peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#A67163]">
                {n.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="l-nombre" className={labelCls}>Tu nombre</label>
          <input id="l-nombre" autoComplete="name" maxLength={LIMITS.nombre} value={f.nombre}
            onChange={(e) => set("nombre", e.target.value)} className={inputCls} {...aria("nombre")} />
          {err("nombre")}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="l-empresa" className={labelCls}>Empresa o marca</label>
          <input id="l-empresa" autoComplete="organization" maxLength={LIMITS.empresa} value={f.empresa}
            onChange={(e) => set("empresa", e.target.value)} className={inputCls} {...aria("empresa")} />
          {err("empresa")}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="l-tipo_negocio" className={labelCls}>Tipo de negocio</label>
          <select id="l-tipo_negocio" value={f.tipo_negocio} onChange={(e) => set("tipo_negocio", e.target.value)}
            className={inputCls} {...aria("tipo_negocio")}>
            <option value="">Elige</option>
            {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {err("tipo_negocio")}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="l-ciudad" className={labelCls}>Ciudad</label>
          <input id="l-ciudad" autoComplete="address-level2" maxLength={LIMITS.ciudad} value={f.ciudad}
            onChange={(e) => set("ciudad", e.target.value)} className={inputCls} {...aria("ciudad")} />
          {err("ciudad")}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="l-cantidad" className={labelCls}>Cantidad aproximada</label>
          <select id="l-cantidad" value={f.cantidad} onChange={(e) => set("cantidad", e.target.value)} className={inputCls}>
            {QUANTITY_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="l-para_cuando" className={labelCls}>¿Para cuándo?</label>
          <select id="l-para_cuando" value={f.para_cuando} onChange={(e) => set("para_cuando", e.target.value)} className={inputCls}>
            {WHEN_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="l-telefono" className={labelCls}>Celular con WhatsApp</label>
          <input id="l-telefono" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="300 123 4567"
            maxLength={20} value={f.telefono} onChange={(e) => set("telefono", e.target.value)} className={inputCls}
            {...aria("telefono")} />
          {err("telefono")}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="l-email" className={labelCls}>Correo (opcional)</label>
          <input id="l-email" type="email" autoComplete="email" maxLength={LIMITS.email} value={f.email}
            onChange={(e) => set("email", e.target.value)} className={inputCls} {...aria("email")} />
          {err("email")}
        </div>
        <div className="flex min-w-0 flex-col gap-1 sm:col-span-2">
          <label htmlFor="l-mensaje" className={labelCls}>Cuéntanos más (opcional)</label>
          <textarea id="l-mensaje" rows={3} maxLength={LIMITS.mensaje} value={f.mensaje}
            onChange={(e) => set("mensaje", e.target.value)}
            placeholder="Espacios, número de tiendas, fechas, lo que imaginas para tu marca…" className={inputCls} />
        </div>
      </div>

      {/* Honeypot anti-spam: invisible para personas y lectores de pantalla. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="l-website">No llenes este campo</label>
        <input id="l-website" tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set("website", e.target.value)} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="flex items-start gap-2.5 text-[13.5px] leading-snug text-[#2D1A14]/75">
          <input id="l-consentimiento" type="checkbox" checked={f.consentimiento}
            onChange={(e) => set("consentimiento", e.target.checked)}
            className="mt-0.5 h-5 w-5 flex-none accent-[#2D1A14]" {...aria("consentimiento")} />
          <span>
            Autorizo a Cliché S.A.S. a tratar mis datos y a contactarme por WhatsApp o correo sobre esta cotización,
            según la{" "}
            <a href="/privacidad" target="_blank" rel="noopener" className="underline underline-offset-2">
              política de tratamiento de datos
            </a>{" "}
            (Ley 1581 de 2012).
          </span>
        </label>
        {err("consentimiento")}
      </div>

      {serverError && (
        <p role="alert" className="rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2D1A14] px-5 py-[15px] text-[16.5px] font-semibold text-[#FAF8F5] transition-colors hover:bg-[#4A2F25] disabled:opacity-60"
      >
        {sending && <Loader2 className="h-4 w-4 animate-spin" />}
        {sending ? "Enviando…" : "Enviar solicitud"}
      </button>
    </form>
  )
}
