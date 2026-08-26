import { NextRequest, NextResponse } from "next/server"
import { isAdmin } from "@/lib/admin-auth"
import { loadBotConfig } from "@/lib/bot/brain"
import { getSessionStatus, listWasenderSessions } from "@/lib/whatsapp"
import { createServerClient } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Evita consultar la lista de sesiones de WaSender en cada poll (la UI pregunta
// cada pocos segundos durante la vinculación). Cache por instancia.
let phoneCheckedAt = 0

// GET → estado en vivo de la sesión de WhatsApp (consulta a WaSenderAPI).
// Cuando está conectada, detecta el número vinculado y lo persiste en
// wa_bot_config.connected_phone — las conversaciones del panel se filtran por él.
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "no autorizado" }, { status: 401 })
  const config = await loadBotConfig()
  if (!config.wasender_api_key) return NextResponse.json({ status: null, configured: false, phone: null })
  const status = await getSessionStatus(config.wasender_api_key)

  let phone = config.connected_phone || null
  if (status === "connected") {
    const token = config.wasender_personal_token || process.env.WASENDER_PERSONAL_TOKEN || ""
    const stale = Date.now() - phoneCheckedAt > 60_000
    if (token && (!phone || stale)) {
      const sessions = await listWasenderSessions(token)
      if (sessions) {
        phoneCheckedAt = Date.now()
        const s =
          sessions.find((x) => x.api_key && x.api_key === config.wasender_api_key) ??
          (sessions.length === 1 ? sessions[0] : null)
        const detected = s?.phone_number?.replace(/\D/g, "") || null
        if (detected && detected !== config.connected_phone) {
          phone = detected
          try {
            await createServerClient()
              .from("wa_bot_config")
              .upsert({ id: 1, connected_phone: detected, updated_at: new Date().toISOString() }, { onConflict: "id" })
          } catch {
            /* se reintenta en el próximo poll */
          }
        }
      }
    }
  }

  return NextResponse.json({ status, configured: true, phone })
}
