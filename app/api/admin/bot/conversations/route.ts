import { NextRequest, NextResponse } from "next/server"
import { isAdmin } from "@/lib/admin-auth"
import { createServerClient } from "@/lib/supabase"

export const dynamic = "force-dynamic"

// Lista de conversaciones: contactos + último mensaje + no leídos.
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "no autorizado" }, { status: 401 })
  try {
    const sb = createServerClient()
    const { data: contacts } = await sb
      .from("wa_contacts")
      .select("phone, name, profile_pic_url, handoff, unread, last_seen")
      .order("last_seen", { ascending: false })
      .limit(100)

    // Último mensaje por contacto (reducimos en memoria sobre los recientes).
    const { data: recent } = await sb
      .from("wa_messages")
      .select("contact_phone, body, direction, created_at")
      .order("created_at", { ascending: false })
      .limit(400)

    const lastByPhone = new Map<string, { body: string; direction: string; created_at: string }>()
    for (const m of recent || []) {
      if (!lastByPhone.has(m.contact_phone)) lastByPhone.set(m.contact_phone, m)
    }

    const conversations = (contacts || []).map((c) => {
      const last = lastByPhone.get(c.phone)
      return {
        ...c,
        last_message: last?.body || "",
        last_direction: last?.direction || "",
        last_at: last?.created_at || c.last_seen,
      }
    })
    return NextResponse.json({ conversations })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
