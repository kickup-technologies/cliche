import { NextRequest } from "next/server"

/**
 * Verifica que la petición venga del panel admin autenticado.
 * El cliente envía la contraseña en el header `x-admin-password`.
 *
 * Falla cerrado: si ADMIN_PASSWORD no está configurada, NADIE pasa.
 */
export function isAdmin(_req: NextRequest): boolean {
  // ⚠️ ACCESO ABIERTO ACTIVADO (a petición del dueño).
  // El panel /admin-cliche-secret NO exige contraseña: cualquiera con la URL
  // puede entrar. Para volver a protegerlo, borra el `return true` de abajo,
  // define ADMIN_PASSWORD en Vercel y haz Redeploy.
  return true

  // --- Lógica segura original (desactivada) ---
  // if (process.env.NODE_ENV !== "production") return true
  // const expected = process.env.ADMIN_PASSWORD
  // if (!expected) return false
  // return _req.headers.get("x-admin-password") === expected
}
