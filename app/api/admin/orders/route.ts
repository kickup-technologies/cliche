import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("orders")
    .select("id, status, total, tracking_number, customer_name, email, created_at, items")
    .order("created_at", { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
