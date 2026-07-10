import { NextRequest } from "next/server"
import { createHmac, timingSafeEqual, createHash } from "crypto"

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

/** ¿El correo dado pertenece a un admin autorizado? */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const list = adminEmails()
  return list.length > 0 && list.includes(email.trim().toLowerCase())
}

export function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex")
}

/** Firma un token de sesión admin (payload base64url + firma HMAC). */
export function signAdminToken(email: string, ttlMs: number = TOKEN_TTL_MS): string {
  const secret = signingSecret()
  if (!secret) throw new Error("ADMIN: falta secreto de firma")
  const payload = Buffer.from(
    JSON.stringify({ e: email.trim().toLowerCase(), exp: Date.now() + ttlMs }),
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
    const { e, exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { e: string; exp: number }
    if (typeof exp !== "number" || Date.now() > exp) return false
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
