import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { verifyPeerKey } from "@/lib/peer"
import { rateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

/**
 * POST /api/peer/send-email {to, subject, html} — relé de correo para la
 * tienda hermana: Bienestar no tiene SMTP propio y (por decisión del negocio)
 * envía con la MISMA cuenta de Cliché, con remitente "Bienestar by Cliché".
 * Protegido por la llave entre tiendas + rate limit.
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { id: "peer-mail", limit: 20, windowMs: 60_000 })
  if (limited) return limited
  if (!verifyPeerKey(req.headers.get("x-peer-key"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  let body: { to?: string; subject?: string; html?: string } = {}
  try { body = await req.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }
  const to = String(body.to || "").trim().slice(0, 120)
  const subject = String(body.subject || "").slice(0, 200)
  const html = String(body.html || "").slice(0, 200_000)
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to) || !subject || !html) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })
  }

  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!user || !pass) return NextResponse.json({ error: "SMTP no configurado" }, { status: 503 })

  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass },
    })
    // Misma cuenta que Cliché, pero el cliente ve la marca de Bienestar.
    await transport.sendMail({ from: `Bienestar by Cliché <${user}>`, to, subject, html })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[peer send-email]", e instanceof Error ? e.message : e)
    return NextResponse.json({ error: "No se pudo enviar" }, { status: 502 })
  }
}
