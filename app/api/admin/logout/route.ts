import { NextResponse } from "next/server"
import { ADMIN_COOKIE } from "@/lib/admin-auth"

/** POST /api/admin/logout — borra la cookie de acceso al panel. */
export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 })
  return res
}
