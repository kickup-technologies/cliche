import { NextRequest } from "next/server"
import { timingSafeEqual } from "crypto"

/**
 * Verifica que la petición venga del panel admin autenticado.
 * El cliente envía la contraseña en el header `x-admin-password`, que se compara
 * en TIEMPO CONSTANTE contra ADMIN_PASSWORD (evita timing attacks).
 *
 * Falla cerrado: en producción, sin ADMIN_PASSWORD configurada NADIE pasa.
 * En local (no producción) se permite para desarrollo — localhost no está expuesto.
 */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  try {
    return timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}

export function isAdmin(req: NextRequest): boolean {
  return verifyAdminPassword(req.headers.get("x-admin-password"))
}

/**
 * Valida una contraseña de admin (venga del header o del body de /verify)
 * en tiempo constante. Falla cerrado: en producción sin ADMIN_PASSWORD, nadie pasa.
 */
export function verifyAdminPassword(provided: string | null | undefined): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) {
    // Sin contraseña configurada: solo desarrollo local; en producción, denegar.
    return process.env.NODE_ENV !== "production"
  }
  return !!provided && safeEqual(provided, expected)
}
