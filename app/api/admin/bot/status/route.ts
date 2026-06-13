import { NextRequest, NextResponse } from "next/server"
import { isAdmin } from "@/lib/admin-auth"
import { loadBotConfig } from "@/lib/bot/brain"
import { getSessionStatus } from "@/lib/whatsapp"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET → estado en vivo de la sesión de WhatsApp (consulta a WaSenderAPI).
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "no autorizado" }, { status: 401 })
  const config = await loadBotConfig()
  if (!config.wasender_api_key) return NextResponse.json({ status: null, configured: false })
  const status = await getSessionStatus(config.wasender_api_key)
  return NextResponse.json({ status, configured: true })
}
