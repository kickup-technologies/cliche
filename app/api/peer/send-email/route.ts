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

  let body: { to?: string; subject?: string; html?: string; attachments?: unknown } = {}
  try { body = await req.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }
  const to = String(body.to || "").trim().slice(0, 120)
  const subject = String(body.subject || "").slice(0, 200)
  const html = String(body.html || "").slice(0, 200_000)
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to) || !subject || !html) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })
  }

  /**
   * Adjuntos (la factura en PDF de Bienestar). Se aceptan solo PDFs y con
   * tope de tamaño: este relé va autenticado, pero un adjunto sin límite es
   * una forma cómoda de tumbar el envío de las DOS tiendas.
   */
  const MAX_ADJUNTO = 4 * 1024 * 1024 // 4 MB ya en binario
  const attachments: { filename: string; content: Buffer; contentType: string }[] = []
  if (Array.isArray(body.attachments)) {
    for (const raw of body.attachments.slice(0, 3)) {
      const a = raw as { filename?: unknown; contentBase64?: unknown; contentType?: unknown }
      const b64 = String(a?.contentBase64 || "")
      const tipo = String(a?.contentType || "application/pdf")
      if (!b64 || tipo !== "application/pdf") continue
      const content = Buffer.from(b64, "base64")
      if (!content.length || content.length > MAX_ADJUNTO) continue
      // El nombre llega de fuera: se limpia para que no pueda salirse de su sitio.
      const filename = String(a?.filename || "documento.pdf").replace(/[^\w.\- ]+/g, "_").slice(0, 120)
      attachments.push({ filename, content, contentType: tipo })
    }
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
    await transport.sendMail({ from: `Bienestar by Cliché <${user}>`, to, subject, html, ...(attachments.length ? { attachments } : {}) })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[peer send-email]", e instanceof Error ? e.message : e)
    return NextResponse.json({ error: "No se pudo enviar" }, { status: 502 })
  }
}
