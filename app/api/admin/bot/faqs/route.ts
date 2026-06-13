import { NextRequest, NextResponse } from "next/server"
import { isAdmin } from "@/lib/admin-auth"
import { createServerClient } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "no autorizado" }, { status: 401 })
  const sb = createServerClient()
  const { data } = await sb.from("wa_faqs").select("*").order("sort_order").order("created_at")
  return NextResponse.json({ faqs: data || [] })
}

// POST → crear (sin id) o actualizar (con id).
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "no autorizado" }, { status: 401 })
  try {
    const { id, question, answer, enabled, sort_order } = await req.json()
    if (!question?.trim() || !answer?.trim()) return NextResponse.json({ error: "faltan datos" }, { status: 400 })
    const sb = createServerClient()
    const row = {
      question: question.trim(),
      answer: answer.trim(),
      enabled: enabled ?? true,
      sort_order: sort_order ?? 0,
    }
    const q = id ? sb.from("wa_faqs").update(row).eq("id", id).select().maybeSingle() : sb.from("wa_faqs").insert(row).select().maybeSingle()
    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ faq: data })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "no autorizado" }, { status: 401 })
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "falta id" }, { status: 400 })
  const sb = createServerClient()
  await sb.from("wa_faqs").delete().eq("id", id)
  return NextResponse.json({ ok: true })
}
