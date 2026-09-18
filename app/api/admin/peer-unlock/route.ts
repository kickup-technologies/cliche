import { NextRequest, NextResponse } from "next/server"
import { ADMIN_COOKIE, signAdminToken, verifyAdminToken } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

/**
 * GET /api/admin/peer-unlock?token=… — canjea el token de handoff (firmado
 * por este mismo servidor, 2 min) por la cookie admin de 8 h y redirige al
 * panel. Lo usa "Abrir panel completo de Cliché" desde el panel de Bienestar.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")
  const panel = new URL("/admin-cliche-secret", req.nextUrl.origin)
  if (!verifyAdminToken(token)) return NextResponse.redirect(panel)
  const res = NextResponse.redirect(panel)
  res.cookies.set(ADMIN_COOKIE, signAdminToken("panel@bienestar-peer", undefined, true), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
    path: "/",
  })
  return res
}
