import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { isAdmin } from "@/lib/admin-auth"
import { rateLimit } from "@/lib/rate-limit"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Anti-enumeración: limita la consulta pública de pedidos por IP
  const limited = rateLimit(req, { id: "order-lookup", limit: 20, windowMs: 60_000 })
  if (limited) return limited

  const { id } = await params
  const supabase = createServerClient()

  // Buscar por UUID o por referencia de Wompi (stripe_session_id)
  let data: Record<string, unknown> | null = null
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

  if (isUUID) {
    const res = await supabase
      .from("orders")
      .select("id, status, total, tracking_number, customer_name, created_at, items, stripe_session_id")
      .eq("id", id)
      .single()
    data = res.data
  } else {
    // Es una referencia Wompi (ej: cliche_1234567890_abc12)
    const res = await supabase
      .from("orders")
      .select("id, status, total, tracking_number, customer_name, created_at, items, stripe_session_id")
      .eq("stripe_session_id", id)
      .single()
    data = res.data
  }

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Enriquecer items con nombres de producto
  const rawItems = (data.items as Array<{ product_id: string; quantity: number }>) || []
  if (rawItems.length > 0) {
    const productIds = rawItems.map((i) => i.product_id)
    const { data: products } = await supabase
      .from("products")
      .select("id, name, price, image_url")
      .in("id", productIds)

    const productMap = new Map((products || []).map((p) => [p.id, p]))
    data = {
      ...data,
      items: rawItems.map((item) => ({
        ...item,
        name: productMap.get(item.product_id)?.name ?? "Producto",
        price: productMap.get(item.product_id)?.price ?? 0,
        image_url: productMap.get(item.product_id)?.image_url ?? "",
      })),
    }
  }

  return NextResponse.json(data)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const supabase = createServerClient()
  const body = await req.json()
  const allowed = ["status", "tracking_number"]
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  const { data, error } = await supabase
    .from("orders")
    .update(update)
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
