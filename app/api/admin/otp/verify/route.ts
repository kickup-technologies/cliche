import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase/server"
import { createServerClient } from "@/lib/supabase"
import { isAdminEmail, adminEmail, sha256, signAdminToken, ADMIN_COOKIE } from "@/lib/admin-auth"
import { rateLimit } from "@/lib/rate-limit"

/**
 * POST /api/admin/otp/verify — valida el código de 4 dígitos. Si es correcto,
 * emite la cookie httpOnly `cliche_admin` (token firmado, 8h) que desbloquea
 * el panel. Solo funciona si la sesión actual es ADMIN_EMAIL.
 */
export async function POST(req: NextRequest) {
  // Anti-fuerza-bruta: máx. 8 intentos por IP cada 10 minutos
  const limited = rateLimit(req, { id: "admin-otp-verify", limit: 8, windowMs: 10 * 60_000 })
  if (limited) return limited

  const supa = await getSupabaseServer()
  const { data } = await supa.auth.getUser()
  const user = data.user
  if (!isAdminEmail(user?.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const body = (await req.json().catch(() => ({}))) as { code?: string }
  const code = String(body.code ?? "").trim()
  if (!/^\d{4}$/.test(code)) {
    return NextResponse.json({ error: "Código inválido" }, { status: 400 })
  }

  const email = adminEmail()!
  const db = createServerClient()
  const { data: row } = await db
    .from("admin_otps")
    .select("id, code_hash, attempts, expires_at")
    .eq("email", email)
    .eq("consumed", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!row) {
    return NextResponse.json({ error: "El código expiró. Pide uno nuevo." }, { status: 400 })
  }
  if (row.attempts >= 5) {
    await db.from("admin_otps").update({ consumed: true }).eq("id", row.id)
    return NextResponse.json({ error: "Demasiados intentos. Pide un código nuevo." }, { status: 429 })
  }
  await db.from("admin_otps").update({ attempts: row.attempts + 1 }).eq("id", row.id)

  if (sha256(code) !== row.code_hash) {
    return NextResponse.json({ error: "Código incorrecto" }, { status: 401 })
  }

  await db.from("admin_otps").update({ consumed: true }).eq("id", row.id)

  const token = signAdminToken(email)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60,
  })
  return res
}
