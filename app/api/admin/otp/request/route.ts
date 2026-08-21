import { NextRequest, NextResponse } from "next/server"
import { randomInt } from "crypto"
import { getSupabaseServer } from "@/lib/supabase/server"
import { createServerClient } from "@/lib/supabase"
import { isAdminEmailAnywhere, sha256 } from "@/lib/admin-auth"
import { sendAdminOtpEmail } from "@/lib/mailer"
import { rateLimit } from "@/lib/rate-limit"

/**
 * POST /api/admin/otp/request — genera un código de 6 dígitos y lo envía por
 * correo a la cuenta admin. Solo funciona si la sesión actual es ADMIN_EMAIL.
 */
export async function POST(req: NextRequest) {
  // Anti-spam: máx. 4 códigos por IP cada 15 minutos
  const limited = rateLimit(req, { id: "admin-otp-request", limit: 4, windowMs: 15 * 60_000 })
  if (limited) return limited

  const supa = await getSupabaseServer()
  const { data } = await supa.auth.getUser()
  const user = data.user
  if (!(await isAdminEmailAnywhere(user?.email))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  // El código se liga y se envía al correo del admin que tiene la sesión.
  const email = user!.email!.trim().toLowerCase()
  const code = String(randomInt(100000, 1000000)) // 6 dígitos (100000–999999) → 1M combinaciones

  const db = createServerClient()
  // Invalidar cualquier código previo sin usar.
  await db.from("admin_otps").update({ consumed: true }).eq("email", email).eq("consumed", false)
  const { error } = await db.from("admin_otps").insert({
    email,
    code_hash: sha256(code),
    expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
  })
  if (error) {
    return NextResponse.json({ error: "No se pudo generar el código" }, { status: 500 })
  }

  const sent = await sendAdminOtpEmail(user!.email!, code)
  if (!sent) {
    return NextResponse.json({ error: "No se pudo enviar el correo (SMTP no configurado)" }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
