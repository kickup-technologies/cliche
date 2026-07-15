import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { verifyResetToken } from "@/lib/auth-reset"
import { rateLimit } from "@/lib/rate-limit"

/**
 * POST /api/auth/password/reset  { token, password }
 * Paso final: con el token firmado (emitido tras verificar el código) cambia la
 * contraseña del usuario en la BD (Supabase Auth, vía service role).
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { id: "pwreset-reset", limit: 10, windowMs: 10 * 60_000 })
  if (limited) return limited

  const { token, password } = await req.json().catch(() => ({}))
  const email = verifyResetToken(token)
  if (!email) {
    return NextResponse.json({ error: "La sesión de cambio expiró. Vuelve a empezar." }, { status: 400 })
  }
  if (typeof password !== "string" || password.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres." }, { status: 400 })
  }

  try {
    const db = createServerClient()
    const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const user = (data?.users || []).find((u) => (u.email || "").toLowerCase() === email)
    if (!user) return NextResponse.json({ error: "No encontramos tu cuenta." }, { status: 400 })

    const { error } = await db.auth.admin.updateUserById(user.id, { password })
    if (error) {
      console.error("[pwreset/reset] updateUser:", error.message)
      return NextResponse.json({ error: "No se pudo cambiar la contraseña. Intenta de nuevo." }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[pwreset/reset]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
