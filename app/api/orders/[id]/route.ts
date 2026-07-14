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

  // NO se incluye customer_name (ni email/teléfono/dirección): este endpoint es
  // público (basta la referencia del pedido, que se comparte en recibos/capturas)
  // y devolver el nombre expondría un dato personal a quien tenga ese número.
  // La página de seguimiento no usa el nombre. Solo estado/total/items/guía.
  const SELECT = "id, status, total, tracking_number, created_at, items, stripe_session_id"

  // Buscar por UUID o por referencia de pedido (stripe_session_id)
  let data: Record<string, unknown> | null = null
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

  if (isUUID) {
    const res = await supabase.from("orders").select(SELECT).eq("id", id).single()
    data = res.data
  } else {
    // Referencia completa (ej: cliche_1234567890_abc12)
    const res = await supabase.from("orders").select(SELECT).eq("stripe_session_id", id).single()
    data = res.data

    // La página de gracias y los correos muestran "Pedido #XXXXXXXX" (últimos 8
    // caracteres en MAYÚSCULAS): aceptamos también ese sufijo para que el número
    // que le enseñamos al cliente funcione en el buscador de seguimiento. Mínimo
    // 8 chars (el largo del número impreso) para reducir colisiones/adivinación.
    if (!data && id.length >= 8 && id.length < 20) {
      // Escapar comodines de ilike para que "_" del sufijo sea literal
      const escaped = id.replace(/[\\%_]/g, (m) => `\\${m}`)
      const res2 = await supabase
        .from("orders")
        .select(SELECT)
        .ilike("stripe_session_id", `%${escaped}`)
        .limit(1)
      data = res2.data?.[0] ?? null
    }
  }

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Enriquecer items SOLO con la imagen del producto. El nombre y el precio
  // guardados en la orden son la fuente de verdad: los de la tabla products
  // son los actuales por UNIDAD y pisarían el precio real pagado por un kit
  // ("Panela — Kit x3" a $145.000 saldría como "Panela" a $78.000).
  type RawItem = {
    product_id?: string
    quantity?: number
    name?: string
    price?: number
    kind?: string
    components?: Array<{ product_id?: string; quantity?: number; name?: string }>
  }
  const rawItems = (data.items as RawItem[]) || []
  if (rawItems.length > 0) {
    // Los kits personalizados usan product_id "pack-*", que NO es un uuid: si
    // entra al .in() contra la columna uuid, Postgres tumba la query completa.
    // Para packs buscamos las imágenes vía sus components.
    const productIds = [
      ...new Set(
        rawItems.flatMap((i) => {
          if (i.kind === "pack" || (typeof i.product_id === "string" && i.product_id.startsWith("pack-"))) {
            return (i.components || [])
              .map((c) => c.product_id)
              .filter((pid): pid is string => typeof pid === "string" && !pid.startsWith("pack-"))
          }
          return typeof i.product_id === "string" ? [i.product_id] : []
        })
      ),
    ]

    const productMap = new Map<string, { id: string; name: string | null; image_url: string | null }>()
    if (productIds.length > 0) {
      const { data: products } = await supabase
        .from("products")
        .select("id, name, image_url")
        .in("id", productIds)
      for (const p of products || []) productMap.set(p.id, p)
    }

    data = {
      ...data,
      items: rawItems.map((item) => {
        const isPack =
          item.kind === "pack" || (typeof item.product_id === "string" && item.product_id.startsWith("pack-"))
        // Imagen: la del producto; en packs, la del primer componente con foto.
        const image_url = isPack
          ? (item.components || [])
              .map((c) => (c.product_id ? productMap.get(c.product_id)?.image_url : null))
              .find((u) => !!u) ?? ""
          : productMap.get(item.product_id ?? "")?.image_url ?? ""
        return {
          ...item,
          // name/price almacenados al comprar; la tabla products solo como
          // respaldo para órdenes antiguas que no los hubieran guardado.
          name: item.name ?? productMap.get(item.product_id ?? "")?.name ?? "Producto",
          price: typeof item.price === "number" ? item.price : 0,
          image_url,
        }
      }),
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
