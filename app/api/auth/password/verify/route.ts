import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import { createServerClient } from "@/lib/supabase"
import { signResetToken } from "@/lib/auth-reset"
import { rateLimit } from "@/lib/rate-limit"

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex")

/**
 * POST /api/auth/password/verify  { email, code }
 * Valida el código de 6 dígitos. Si es correcto, lo consume y devuelve un token
 * firmado (10 min) que autoriza el cambio de contraseña en el paso final.
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { id: "pwreset-verify", limit: 10, windowMs: 10 * 60_000 })
  if (limited) return limited

  const { email, code } = await req.json().catch(() => ({}))
  const e = String(email || "").trim().toLowerCase()
  const c = String(code || "").trim()
  if (!e.includes("@") || !/^\d{6}$/.test(c)) {
    return NextResponse.json({ error: "Código inválido" }, { status: 400 })
  }

  const db = createServerClient()
  const { data: row } = await db
    .from("password_reset_codes")
    .select("id, code_hash, attempts")
    .eq("email", e)
    .eq("consumed", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!row) return NextResponse.json({ error: "El código expiró o no existe. Pide uno nuevo." }, { status: 400 })
  if (row.attempts >= 5) {
    await db.from("password_reset_codes").update({ consumed: true }).eq("id", row.id)
    return NextResponse.json({ error: "Demasiados intentos. Pide un código nuevo." }, { status: 429 })
  }
  await db.from("password_reset_codes").update({ attempts: row.attempts + 1 }).eq("id", row.id)

  if (sha256(c) !== row.code_hash) {
    return NextResponse.json({ error: "Código incorrecto" }, { status: 401 })
  }

  await db.from("password_reset_codes").update({ consumed: true }).eq("id", row.id)
  return NextResponse.json({ ok: true, token: signResetToken(e) })
}
