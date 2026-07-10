import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase/server"
import { isAdminEmail, isAdmin } from "@/lib/admin-auth"

/**
 * GET /api/admin/whoami — dice al panel en qué estado está el visitante:
 *  - authenticated: hay sesión de usuario
 *  - isAdminEmail:  esa sesión es la cuenta de la dueña (ADMIN_EMAIL)
 *  - unlocked:      ya pasó el código OTP (cookie admin válida)
 * No expone ADMIN_EMAIL ni datos sensibles.
 */
export async function GET(req: NextRequest) {
  let authenticated = false
  let email: string | null | undefined = null
  try {
    const supa = await getSupabaseServer()
    const { data } = await supa.auth.getUser()
    authenticated = !!data.user
    email = data.user?.email
  } catch {
    // sin sesión / error → tratado como no autenticado
  }
  return NextResponse.json({
    authenticated,
    isAdminEmail: isAdminEmail(email),
    unlocked: isAdmin(req),
  })
}
