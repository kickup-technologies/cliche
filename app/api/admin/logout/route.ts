import { NextResponse } from "next/server"
import { ADMIN_COOKIE, adminCookieOpts } from "@/lib/admin-auth"

/** POST /api/admin/logout — borra la cookie de acceso al panel. Mismos
 *  atributos que al crearla (None/Secure en prod): en contexto embebido
 *  (panel dentro del panel de Bienestar) Chrome rechaza borrar cookies sin
 *  SameSite=None; Secure. */
export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, "", { ...adminCookieOpts(), maxAge: 0 })
  return res
}
