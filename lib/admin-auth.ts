import { NextRequest } from "next/server"
import { createHmac, timingSafeEqual, createHash } from "crypto"
import { createServerClient } from "@/lib/supabase"

/**
 * Autorización del panel admin — modelo nuevo (2 factores):
 *
 *  1. La dueña inicia sesión con su cuenta NORMAL (Supabase) cuyo correo debe
 *     ser exactamente ADMIN_EMAIL.
 *  2. Se le envía un código de 4 dígitos a ese correo; al validarlo, el servidor
 *     emite un TOKEN firmado (HMAC) que se guarda en una cookie httpOnly
 *     `cliche_admin`. Ese token es la prueba de acceso al panel.
 *
 * `isAdmin(req)` valida ese token (sin estado, HMAC). Falla cerrado: sin secreto
 * o sin ADMIN_EMAIL, nadie es admin.
 */

export const ADMIN_COOKIE = "cliche_admin"
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000 // 8 horas

/** Secreto para firmar el token: dedicado si existe, si no la service_role key (server-only). */
function signingSecret(): string | null {
  return process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || null
}

/**
 * Correos autorizados como admin (normalizados). Se leen de ADMIN_EMAILS
 * (lista separada por comas) y, además, siempre incluye ADMIN_EMAIL (el
 * correo de la dueña, que también recibe las alertas de pedidos).
 */
export function adminEmails(): string[] {
  const raw = [process.env.ADMIN_EMAIL, ...(process.env.ADMIN_EMAILS || "").split(",")]
  return [...new Set(raw.map((e) => (e || "").trim().toLowerCase()).filter(Boolean))]
}

/** ¿El correo dado pertenece a un admin autorizado por las envs? */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const list = adminEmails()
  return list.length > 0 && list.includes(email.trim().toLowerCase())
}

/**
 * Correos admin ADICIONALES guardados en la BD (site_settings, clave
 * `admin_emails_extra`, lista separada por comas). Complementa a las envs para
 * poder dar de alta/baja admins sin tocar Vercel. Solo el service_role puede
 * leer esa clave (NO está en la allowlist de la policy pública de
 * site_settings — mantenerla fuera). Cache de 60s por instancia; si la BD
 * falla se responde con lo último visto o [] — nunca se abre de más.
 */
let dbAdminCache: { list: string[]; at: number } | null = null
export async function dbAdminEmails(): Promise<string[]> {
  if (dbAdminCache && Date.now() - dbAdminCache.at < 60_000) return dbAdminCache.list
  try {
    const { data, error } = await createServerClient()
      .from("site_settings")
      .select("value")
      .eq("key", "admin_emails_extra")
      .maybeSingle()
    if (error) return dbAdminCache?.list ?? []
    const list = String(data?.value || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
    dbAdminCache = { list, at: Date.now() }
    return list
  } catch {
    return dbAdminCache?.list ?? []
  }
}

/**
 * Correos admin EXENTOS del código OTP (site_settings, clave `admin_otp_skip`,
 * lista separada por comas; solo legible por service_role, fuera de la
 * allowlist pública). Un correo aquí sigue necesitando iniciar sesión con su
 * cuenta y ser admin (envs o admin_emails_extra); solo se le omite el 2º
 * factor. Quitar el correo de la fila reactiva el OTP sin deploy.
 */
let otpSkipCache: { list: string[]; at: number } | null = null
export async function otpSkipEmails(): Promise<string[]> {
  if (otpSkipCache && Date.now() - otpSkipCache.at < 60_000) return otpSkipCache.list
  try {
    const { data, error } = await createServerClient()
      .from("site_settings")
      .select("value")
      .eq("key", "admin_otp_skip")
      .maybeSingle()
    if (error) return otpSkipCache?.list ?? []
    const list = String(data?.value || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
    otpSkipCache = { list, at: Date.now() }
    return list
  } catch {
    return otpSkipCache?.list ?? []
  }
}

/**
 * ¿Correo admin según envs O según la lista de la BD? Es la comprobación que
 * usan whoami y el flujo OTP (los puntos donde se decide a quién se le emite
 * acceso). Exige que exista al menos un admin por envs (mismo fail-closed de
 * siempre): la BD solo AMPLÍA la lista, nunca habilita un panel sin dueña.
 */
export async function isAdminEmailAnywhere(email: string | null | undefined): Promise<boolean> {
  if (!email) return false
  if (isAdminEmail(email)) return true
  if (adminEmails().length === 0) return false
  return (await dbAdminEmails()).includes(email.trim().toLowerCase())
}

export function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex")
}

/**
 * Firma un token de sesión admin (payload base64url + firma HMAC).
 * `viaDb` marca (claim `d:1`) que la autorización vino de la lista de la BD:
 * la verificación del token (sync, en cada petición admin) no puede consultar
 * la BD, así que confía en ese claim — que solo puede firmarlo el servidor y
 * solo se emite tras pasar el OTP con el correo ya validado contra la BD.
 * Contra: quitar un admin de la BD deja vivo su token hasta 8h (TTL).
 */
export function signAdminToken(email: string, ttlMs: number = TOKEN_TTL_MS, viaDb = false): string {
  const secret = signingSecret()
  if (!secret) throw new Error("ADMIN: falta secreto de firma")
  const payload = Buffer.from(
    JSON.stringify({ e: email.trim().toLowerCase(), exp: Date.now() + ttlMs, ...(viaDb ? { d: 1 } : {}) }),
  ).toString("base64url")
  const sig = createHmac("sha256", secret).update(payload).digest("base64url")
  return `${payload}.${sig}`
}

/** Valida el token: firma correcta, no expirado y correo en la lista admin. */
export function verifyAdminToken(token: string | null | undefined): boolean {
  const secret = signingSecret()
  if (!secret || adminEmails().length === 0 || !token) return false
  const [payload, sig] = token.split(".")
  if (!payload || !sig) return false
  const expected = createHmac("sha256", secret).update(payload).digest("base64url")
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false
  try {
    const { e, exp, d } = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      e: string
      exp: number
      d?: number
    }
    if (typeof exp !== "number" || Date.now() > exp) return false
    // Claim d:1 = admin de la lista en BD, ya validado al emitir (ver signAdminToken).
    if (d === 1) return typeof e === "string" && e.length > 0
    return isAdminEmail(e)
  } catch {
    return false
  }
}

/**
 * Verifica que la petición venga del panel admin desbloqueado.
 * Lee la cookie httpOnly `cliche_admin` y valida el token firmado.
 */
export function isAdmin(req: NextRequest): boolean {
  return verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value)
}
