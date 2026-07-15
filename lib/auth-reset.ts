import { createHmac, timingSafeEqual } from "crypto"

/**
 * Token firmado (HMAC) que prueba que un usuario verificó su código de 6 dígitos
 * para restablecer contraseña. Lo emite /api/auth/password/verify y lo consume
 * /api/auth/password/reset — así el paso final no necesita re-enviar el código.
 * Es sin estado: no se guarda en BD, se valida por firma + expiración.
 */
const TTL_MS = 10 * 60 * 1000 // 10 minutos para completar el cambio

function secret(): string | null {
  return process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || null
}

export function signResetToken(email: string): string {
  const s = secret()
  if (!s) throw new Error("reset: falta secreto de firma")
  const payload = Buffer.from(
    JSON.stringify({ e: email.trim().toLowerCase(), p: "pwreset", exp: Date.now() + TTL_MS }),
  ).toString("base64url")
  const sig = createHmac("sha256", s).update(payload).digest("base64url")
  return `${payload}.${sig}`
}

/** Devuelve el email si el token es válido (firma + no expirado + propósito), o null. */
export function verifyResetToken(token: string | null | undefined): string | null {
  const s = secret()
  if (!s || !token) return null
  const [payload, sig] = token.split(".")
  if (!payload || !sig) return null
  const expected = createHmac("sha256", s).update(payload).digest("base64url")
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const { e, p, exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { e: string; p: string; exp: number }
    if (p !== "pwreset" || typeof exp !== "number" || Date.now() > exp) return null
    return typeof e === "string" && e.includes("@") ? e : null
  } catch {
    return null
  }
}
