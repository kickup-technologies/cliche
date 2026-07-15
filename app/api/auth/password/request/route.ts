import { NextRequest, NextResponse } from "next/server"
import { randomInt, createHash } from "crypto"
import { createServerClient } from "@/lib/supabase"
import { sendPasswordResetCode } from "@/lib/mailer"
import { rateLimit } from "@/lib/rate-limit"

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex")

/**
 * POST /api/auth/password/request  { email }
 * Envía un código de 6 dígitos al correo (desde NUESTRO dominio) para
 * restablecer la contraseña. Responde SIEMPRE ok (no revela si el correo
 * existe). Solo genera+envía código si hay una cuenta con ese correo.
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { id: "pwreset-request", limit: 5, windowMs: 15 * 60_000 })
  if (limited) return limited

  try {
    const { email } = await req.json()
    const e = String(email || "").trim().toLowerCase()
    if (!e.includes("@")) return NextResponse.json({ ok: true })

    const db = createServerClient()
    const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const exists = (data?.users || []).some((u) => (u.email || "").toLowerCase() === e)

    if (exists) {
      const code = String(randomInt(100000, 1000000)) // 6 dígitos
      // Invalidar códigos previos sin usar de ese correo.
      await db.from("password_reset_codes").update({ consumed: true }).eq("email", e).eq("consumed", false)
      await db.from("password_reset_codes").insert({
        email: e,
        code_hash: sha256(code),
        expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
      })
      await sendPasswordResetCode(e, code)
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[pwreset/request]", err)
    return NextResponse.json({ ok: true }) // no revelar errores internos
  }
}
