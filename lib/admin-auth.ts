import { NextRequest } from "next/server"

/**
 * Verifica que la petición venga del panel admin autenticado.
 * El cliente envía la contraseña en el header `x-admin-password`.
 *
 * Falla cerrado: si ADMIN_PASSWORD no está configurada, NADIE pasa.
 */
export function isAdmin(req: NextRequest): boolean {
  // Bypass SOLO en desarrollo local (pnpm dev). En producción JAMÁS aplica:
  // así puedes usar el panel sin contraseña mientras desarrollas, pero el
  // sitio en vivo sigue exigiendo ADMIN_PASSWORD.
  if (process.env.NODE_ENV !== "production") return true

  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  return req.headers.get("x-admin-password") === expected
}
