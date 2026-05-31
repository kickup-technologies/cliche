import { NextRequest, NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  // Anti-fuerza-bruta: máx. 5 intentos por IP cada 5 minutos
  const limited = rateLimit(req, { id: "admin-verify", limit: 5, windowMs: 5 * 60_000 })
  if (limited) return limited

  const { password } = await req.json()
  const adminPassword = process.env.ADMIN_PASSWORD

  // SEGURIDAD: si ADMIN_PASSWORD no está configurada, NEGAR acceso.
  // (Antes se permitía el acceso sin contraseña — panel abierto a cualquiera.)
  if (!adminPassword) {
    console.error("[admin/verify] ADMIN_PASSWORD no configurada — acceso denegado")
    return NextResponse.json(
      { error: "Panel no configurado. Define ADMIN_PASSWORD." },
      { status: 503 }
    )
  }

  if (password !== adminPassword) {
    return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 })
  }
  return NextResponse.json({ ok: true })
}
