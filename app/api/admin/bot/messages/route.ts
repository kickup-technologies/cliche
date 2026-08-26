import { NextRequest, NextResponse } from "next/server"
import { isAdmin } from "@/lib/admin-auth"
import { createServerClient } from "@/lib/supabase"
import { sendWhatsAppBotReply } from "@/lib/whatsapp"
import { loadBotConfig } from "@/lib/bot/brain"

export const dynamic = "force-dynamic"

// GET ?phone=... → historial de mensajes (cronológico). Marca como leído.
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "no autorizado" }, { status: 401 })
  const phone = req.nextUrl.searchParams.get("phone")?.replace(/\D/g, "") || ""
  if (!phone) return NextResponse.json({ error: "falta phone" }, { status: 400 })
  try {
    const sb = createServerClient()
    // Solo el historial de la conexión actual (mensajes de números anteriores fuera).
    const config = await loadBotConfig()
    if (!config.connected_phone) return NextResponse.json({ messages: [] })
    const { data } = await sb
      .from("wa_messages")
      .select("id, direction, role, body, media_url, media_type, created_at")
      .eq("contact_phone", phone)
      .eq("session_phone", config.connected_phone)
      .order("created_at", { ascending: true })
      .limit(500)
    await sb.from("wa_contacts").update({ unread: 0 }).eq("phone", phone)
    return NextResponse.json({ messages: data || [] })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// POST { phone, text } → enviar respuesta manual (humano). Activa handoff.
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "no autorizado" }, { status: 401 })
  try {
    const { phone, text } = await req.json()
    const to = String(phone || "").replace(/\D/g, "")
    if (!to || !text?.trim()) return NextResponse.json({ error: "faltan datos" }, { status: 400 })
    const sb = createServerClient()
    const config = await loadBotConfig()
    await sendWhatsAppBotReply(to, text.trim(), config.wasender_api_key || undefined)
    await sb.from("wa_messages").insert({ contact_phone: to, direction: "out", role: "agent", body: text.trim(), session_phone: config.connected_phone || null })
    await sb.from("wa_contacts").update({ handoff: true, last_seen: new Date().toISOString() }).eq("phone", to)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// PATCH { phone, handoff } → pausar/reanudar el bot para un contacto.
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "no autorizado" }, { status: 401 })
  try {
    const { phone, handoff } = await req.json()
    const to = String(phone || "").replace(/\D/g, "")
    if (!to) return NextResponse.json({ error: "falta phone" }, { status: 400 })
    const sb = createServerClient()
    await sb.from("wa_contacts").update({ handoff: !!handoff }).eq("phone", to)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
