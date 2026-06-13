import { NextRequest, NextResponse } from "next/server"
import { isAdmin } from "@/lib/admin-auth"
import { createServerClient } from "@/lib/supabase"

export const dynamic = "force-dynamic"

const EDITABLE = [
  "advisor_name",
  "system_prompt",
  "greeting",
  "bot_enabled",
  "followups_enabled",
  "catalog_pdf_url",
  "store_address",
  "store_hours",
  "store_city",
  "store_maps_url",
  "wasender_api_key",
  "wasender_webhook_secret",
] as const

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "no autorizado" }, { status: 401 })
  try {
    const sb = createServerClient()
    const { data } = await sb.from("wa_bot_config").select("*").eq("id", 1).maybeSingle()
    return NextResponse.json({ config: data || null })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "no autorizado" }, { status: 401 })
  try {
    const body = await req.json()
    const patch: Record<string, unknown> = { id: 1, updated_at: new Date().toISOString() }
    for (const k of EDITABLE) if (k in body) patch[k] = body[k]
    const sb = createServerClient()
    const { data, error } = await sb.from("wa_bot_config").upsert(patch, { onConflict: "id" }).select().maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ config: data })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
