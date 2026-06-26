import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"

// ⚠️ TEMPORAL — diagnóstico de SMTP. BORRAR tras verificar.
// Protegido con un token en la query. No revela la contraseña (solo su longitud).
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("t") !== "cliche_diag_8f3k") {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM, ADMIN_EMAIL } = process.env

  const present = {
    SMTP_HOST: SMTP_HOST || null,
    SMTP_PORT: SMTP_PORT || null,
    SMTP_SECURE: SMTP_SECURE || null,
    SMTP_USER: SMTP_USER || null,
    SMTP_PASS_present: !!SMTP_PASS,
    SMTP_PASS_len: SMTP_PASS ? SMTP_PASS.length : 0,
    SMTP_FROM: SMTP_FROM || null,
    ADMIN_EMAIL: ADMIN_EMAIL || null,
  }

  let verify = "not-attempted"
  let sendResult = "not-attempted"

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    const t = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT ?? 587),
      secure: SMTP_SECURE === "true",
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
    try {
      await t.verify()
      verify = "ok"
    } catch (e) {
      verify = "ERROR: " + (e instanceof Error ? e.message : String(e))
    }
    try {
      const info = await t.sendMail({
        from: SMTP_FROM || SMTP_USER,
        to: "pipebonillaesc25@gmail.com",
        subject: "Prueba SMTP Cliché",
        text: "Si lees esto, el SMTP de Cliché funciona.",
      })
      sendResult = "ok: " + info.messageId
    } catch (e) {
      sendResult = "ERROR: " + (e instanceof Error ? e.message : String(e))
    }
  } else {
    verify = "FALTAN variables SMTP en este deployment"
  }

  return NextResponse.json({ present, verify, sendResult })
}
