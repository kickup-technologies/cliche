import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  const adminPassword = process.env.ADMIN_PASSWORD

  // Si ADMIN_PASSWORD no está configurada, permitir acceso sin contraseña
  if (!adminPassword) {
    return NextResponse.json({ ok: true })
  }

  if (password !== adminPassword) {
    return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 })
  }
  return NextResponse.json({ ok: true })
}
