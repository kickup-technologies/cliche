import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

function makeCode(email: string): string {
  const base = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6)
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase()
  return `${base}${suffix}`
}

export async function POST(req: NextRequest) {
  try {
    const { session_id } = await req.json()
    if (!session_id) return NextResponse.json({ error: "session_id required" }, { status: 400 })

    const supabase = createServerClient()

    // Find the order to get the buyer's email
    const { data: order } = await supabase
      .from("orders")
      .select("id, customer_email, used_referral")
      .eq("stripe_session_id", session_id)
      .single()

    const ownerEmail = order?.customer_email ?? session_id

    // Check if we already generated a referral code for this buyer
    const { data: existing } = await supabase
      .from("referral_codes")
      .select("code, discount_percent")
      .eq("owner_email", ownerEmail)
      .single()

    if (existing) {
      return NextResponse.json({ code: existing.code, discount_percent: existing.discount_percent })
    }

    // Create new referral code
    const code = makeCode(ownerEmail)
    const discount_percent = 10

    const { error } = await supabase.from("referral_codes").insert({
      code,
      owner_email: ownerEmail,
      discount_percent,
      uses: 0,
    })

    if (error) throw error

    return NextResponse.json({ code, discount_percent })
  } catch (err) {
    console.error("[referral/generate]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
