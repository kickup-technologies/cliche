import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase/server"
import { isAdminEmailAnywhere, isAdmin } from "@/lib/admin-auth"

/**
 * GET /api/admin/whoami — dice al panel en qué estado está el visitante:
 *  - authenticated: hay sesión de usuario
 *  - isAdminEmail:  esa sesión es una cuenta admin (envs o lista en BD)
 *  - unlocked:      ya pasó el código OTP (cookie admin válida)
 * No expone ADMIN_EMAIL ni datos sensibles.
 */
export async function GET(req: NextRequest) {
  let authenticated = false
  let sessionInvalid = false
  let email: string | null | undefined = null
  try {
    const supa = await getSupabaseServer()
    const { data, error } = await supa.auth.getUser()
    authenticated = !!data.user
    email = data.user?.email
    // sessionInvalid: el rechazo es DEFINITIVO (sin cookie o token inválido,
    // 400/401/403) y el cliente puede limpiar su sesión local con confianza.
    // Un fallo transitorio (red/Supabase caído) NO debe cerrar sesiones válidas.
    if (!authenticated) {
      sessionInvalid = !error || [400, 401, 403].includes(error.status ?? 0)
    }
  } catch {
    // error inesperado → tratado como transitorio: no invitar a purgar sesión
  }
  return NextResponse.json({
    authenticated,
    sessionInvalid,
    isAdminEmail: await isAdminEmailAnywhere(email),
    unlocked: isAdmin(req),
  })
}
