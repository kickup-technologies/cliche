import { NextRequest, NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  // Anti-fuerza-bruta: máx. 5 intentos por IP cada 5 minutos
  const limited = rateLimit(req, { id: "admin-verify", limit: 5, windowMs: 5 * 60_000 })
  if (limited) return limited

  await req.json().catch(() => ({}))

  // ⚠️ ACCESO ABIERTO ACTIVADO (a petición del dueño): el login acepta sin
  // contraseña. Para volver a protegerlo, restaura la validación contra
  // ADMIN_PASSWORD (ver lib/admin-auth.ts) y define la variable en Vercel.
  return NextResponse.json({ ok: true, open: true })
}
