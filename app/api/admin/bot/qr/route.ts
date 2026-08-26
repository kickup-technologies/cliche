import { NextRequest, NextResponse } from "next/server"
import QRCode from "qrcode"
import { isAdmin } from "@/lib/admin-auth"
import { loadBotConfig } from "@/lib/bot/brain"
import { createServerClient } from "@/lib/supabase"
import {
  listWasenderSessions,
  connectWasenderSession,
  getWasenderSessionQr,
  updateWasenderSession,
  type WasenderSession,
} from "@/lib/whatsapp"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Elige la sesión a vincular: la que coincida con la API key guardada, o la única/primera. */
function pickSession(sessions: WasenderSession[], storedApiKey: string | null): WasenderSession | null {
  if (sessions.length === 0) return null
  if (storedApiKey) {
    const match = sessions.find((s) => s.api_key && s.api_key === storedApiKey)
    if (match) return match
  }
  return sessions[0]
}

/** Guarda credenciales de la sesión en wa_bot_config si WaSenderAPI las entregó. */
async function autoSaveCredentials(session: WasenderSession | null) {
  if (!session?.api_key) return
  try {
    const sb = createServerClient()
    await sb
      .from("wa_bot_config")
      .upsert(
        {
          id: 1,
          wasender_api_key: session.api_key,
          ...(session.webhook_secret ? { wasender_webhook_secret: session.webhook_secret } : {}),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      )
  } catch {
    /* best-effort: si falla, la clienta aún puede pegar la key a mano */
  }
}

// POST → deja la sesión lista (webhook + credenciales) e inicia la vinculación
// por QR. Devuelve el QR como data URL, o status connected si ya está vinculada.
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "no autorizado" }, { status: 401 })
  try {
    const config = await loadBotConfig()
    const token =
      (config as { wasender_personal_token?: string | null }).wasender_personal_token ||
      process.env.WASENDER_PERSONAL_TOKEN ||
      ""
    if (!token) {
      return NextResponse.json(
        { error: "Falta el token personal de WaSenderAPI. Pégalo en «Configuración avanzada» y guarda.", needToken: true },
        { status: 400 },
      )
    }

    const sessions = await listWasenderSessions(token)
    if (!sessions) {
      return NextResponse.json(
        { error: "No se pudo consultar WaSenderAPI. Revisa que el token personal sea válido.", needToken: true },
        { status: 502 },
      )
    }
    let session = pickSession(sessions, config.wasender_api_key)
    if (!session) {
      return NextResponse.json(
        { error: "No hay sesiones en la cuenta de WaSenderAPI. Crea una en wasenderapi.com/dashboard." },
        { status: 404 },
      )
    }

    // Auto-configura el webhook del bot y recupera api_key/webhook_secret.
    const host = req.headers.get("host")
    const proto = req.headers.get("x-forwarded-proto") ?? "https"
    const webhookUrl = host ? `${proto}://${host}/api/webhooks/whatsapp` : null
    if (host && webhookUrl && !host.startsWith("localhost")) {
      const updated = await updateWasenderSession(token, session.id, {
        webhook_url: webhookUrl,
        webhook_enabled: true,
        webhook_events: ["messages.received", "session.status"],
      })
      if (updated) session = { ...session, ...updated }
    }
    await autoSaveCredentials(session)

    const conn = await connectWasenderSession(token, session.id)
    const status = conn?.status ?? null

    if (typeof status === "string" && status.toLowerCase() === "connected") {
      // Ya vinculada: persistir el número conectado para el filtro de conversaciones.
      const phone = session.phone_number?.replace(/\D/g, "") || null
      if (phone) {
        const sb = createServerClient()
        await sb
          .from("wa_bot_config")
          .upsert({ id: 1, connected_phone: phone, updated_at: new Date().toISOString() }, { onConflict: "id" })
          .then(undefined, () => {})
      }
      return NextResponse.json({ status: "connected", qr: null, session: publicSession(session) })
    }

    // El connect a veces ya trae el QR; si no, se pide al endpoint dedicado.
    let qrString = conn?.qrCode ?? null
    if (!qrString) qrString = await getWasenderSessionQr(token, session.id)
    if (!qrString) {
      return NextResponse.json(
        { error: "WaSenderAPI no entregó el QR. Espera unos segundos e intenta de nuevo.", status },
        { status: 502 },
      )
    }

    const qrDataUrl = await QRCode.toDataURL(qrString, { width: 480, margin: 1 })
    return NextResponse.json({ status: status ?? "need_scan", qr: qrDataUrl, session: publicSession(session) })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

function publicSession(s: WasenderSession) {
  return { id: s.id, name: s.name, phone_number: s.phone_number }
}
