import { NextRequest, NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"
import { verifyAdminPassword } from "@/lib/admin-auth"

/**
 * POST /api/admin/verify — valida la contraseña del panel admin.
 * Compara en tiempo constante contra ADMIN_PASSWORD (lib/admin-auth) y falla
 * cerrado en producción. Anti-fuerza-bruta por rate limit.
 */
export async function POST(req: NextRequest) {
  // Anti-fuerza-bruta: máx. 5 intentos por IP cada 5 minutos
  const limited = rateLimit(req, { id: "admin-verify", limit: 5, windowMs: 5 * 60_000 })
  if (limited) return limited

  const body = (await req.json().catch(() => ({}))) as { password?: string }
  const password = body?.password ?? req.headers.get("x-admin-password")

  if (!verifyAdminPassword(password)) {
    return NextResponse.json({ ok: false, error: "Contraseña incorrecta" }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
