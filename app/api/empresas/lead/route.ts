import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { rateLimit } from "@/lib/rate-limit"
import { sendB2BLeadAlert } from "@/lib/mailer"
import {
  BUSINESS_TYPES,
  LIMITS,
  NEED_OPTIONS,
  ORIGIN_PARAMS,
  QUANTITY_OPTIONS,
  WHEN_OPTIONS,
  classifyOrigin,
  isValidEmail,
  normalizeCoMobile,
  type LeadOrigin,
} from "@/lib/b2b-leads"

/**
 * POST /api/empresas/lead
 *
 * Formulario de cotización de la landing B2B /empresas. Valida TODO en el
 * servidor (el cliente solo ayuda), guarda el contacto con su origen en
 * `b2b_leads` (service role; la tabla tiene RLS sin políticas) y avisa al
 * equipo comercial por correo. El evento Lead (Pixel + CAPI con el mismo
 * event_id) lo dispara el navegador al recibir la respuesta OK.
 */

const clean = (v: unknown, max: number): string =>
  typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : ""

/** Igual que clean pero conserva los saltos de línea (mensaje libre). */
const cleanMultiline = (v: unknown, max: number): string =>
  typeof v === "string"
    ? v.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000B-\u001F\u007F]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, max)
    : ""

const oneOf = <T extends readonly string[]>(v: unknown, list: T): T[number] | null =>
  typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T[number]) : null

function cleanOrigin(raw: unknown): LeadOrigin {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
  const out: LeadOrigin = {}
  for (const k of ORIGIN_PARAMS) {
    const v = clean(o[k], 300)
    if (v) out[k] = v
  }
  const ref = clean(o.referrer, 500)
  if (/^https?:\/\//i.test(ref)) out.referrer = ref
  const landing = clean(o.landing_page, 500)
  if (landing.startsWith("/")) out.landing_page = landing
  const at = clean(o.landed_at, 40)
  const t = at ? Date.parse(at) : NaN
  // Fecha razonable: no futura y de máximo ~100 días atrás.
  if (Number.isFinite(t) && t <= Date.now() + 60_000 && t > Date.now() - 100 * 86400_000) {
    out.landed_at = new Date(t).toISOString()
  }
  return out
}

export async function POST(req: NextRequest) {
  // Anti-spam: máx. 5 envíos por IP cada 10 minutos
  const limited = rateLimit(req, { id: "b2b-lead", limit: 5, windowMs: 10 * 60_000 })
  if (limited) return limited

  let body: Record<string, unknown>
  try {
    body = await req.json()
    if (!body || typeof body !== "object") throw new Error("body")
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 })
  }

  // Honeypot: campo oculto que una persona nunca llena. Se responde OK para
  // no darle pistas al bot, pero no se guarda nada.
  if (clean(body.website, 200)) return NextResponse.json({ ok: true })

  const errors: Record<string, string> = {}

  const need = NEED_OPTIONS.find((n) => n.value === body.necesidad)
  if (!need) errors.necesidad = "Elige qué necesitas."

  const nombre = clean(body.nombre, LIMITS.nombre)
  if (nombre.length < 2) errors.nombre = "Escribe tu nombre."

  const empresa = clean(body.empresa, LIMITS.empresa)
  if (empresa.length < 2) errors.empresa = "Escribe el nombre de tu empresa."

  const tipo = oneOf(body.tipo_negocio, BUSINESS_TYPES)
  if (!tipo) errors.tipo_negocio = "Elige el tipo de negocio."

  const ciudad = clean(body.ciudad, LIMITS.ciudad)
  if (ciudad.length < 2) errors.ciudad = "Escribe tu ciudad."

  const cantidad = oneOf(body.cantidad, QUANTITY_OPTIONS) ?? QUANTITY_OPTIONS[0]
  const cuando = oneOf(body.para_cuando, WHEN_OPTIONS) ?? WHEN_OPTIONS[0]

  const telefono = normalizeCoMobile(typeof body.telefono === "string" ? body.telefono : "")
  if (!telefono) errors.telefono = "Escribe un celular de 10 dígitos que empiece por 3."

  const emailRaw = clean(body.email, LIMITS.email).toLowerCase()
  if (emailRaw && !isValidEmail(emailRaw)) errors.email = "Revisa el correo."

  const mensaje = cleanMultiline(body.mensaje, LIMITS.mensaje)

  if (body.consentimiento !== true) errors.consentimiento = "Necesitamos tu autorización para contactarte."

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "Revisa los datos del formulario.", fields: errors }, { status: 400 })
  }

  const origin = cleanOrigin(body.origen)
  const canal = classifyOrigin(origin)
  const fbc = clean(body.fbc, 300) || null
  const fbp = clean(body.fbp, 300) || null
  const eventId = clean(body.event_id, 80) || null

  const now = new Date().toISOString()
  const row = {
    necesidad: need!.value,
    nombre,
    empresa,
    tipo_negocio: tipo!,
    ciudad,
    cantidad,
    para_cuando: cuando,
    telefono: telefono!,
    email: emailRaw || null,
    mensaje: mensaje || null,
    consentimiento: true,
    consentimiento_at: now,
    origen: canal,
    utm_source: origin.utm_source ?? null,
    utm_medium: origin.utm_medium ?? null,
    utm_campaign: origin.utm_campaign ?? null,
    utm_content: origin.utm_content ?? null,
    utm_term: origin.utm_term ?? null,
    gclid: origin.gclid ?? null,
    gbraid: origin.gbraid ?? null,
    wbraid: origin.wbraid ?? null,
    fbclid: origin.fbclid ?? null,
    fbc,
    fbp,
    referrer: origin.referrer ?? null,
    landing_page: origin.landing_page ?? null,
    landed_at: origin.landed_at ?? null,
    event_id: eventId,
  }

  try {
    const { data, error } = await createServerClient().from("b2b_leads").insert(row).select("id, created_at").single()
    if (error) throw error

    // Aviso al equipo comercial. El mailer nunca lanza (registra y sigue), y
    // un correo caído no debe perder el contacto ya guardado.
    await sendB2BLeadAlert({ ...row, created_at: data.created_at })

    return NextResponse.json({ ok: true, id: data.id })
  } catch (err) {
    console.error("[empresas/lead] insert:", err)
    return NextResponse.json(
      { error: "No pudimos guardar tu solicitud. Escríbenos por WhatsApp y te atendemos de inmediato." },
      { status: 500 },
    )
  }
}
