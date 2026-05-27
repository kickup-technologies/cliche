import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword || password !== adminPassword) {
    return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 })
  }
  return NextResponse.json({ ok: true })
}
