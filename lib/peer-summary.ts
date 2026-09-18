import { createServerClient } from "@/lib/supabase"
import { SELF_STORE, PeerSummary, PeerOrder } from "@/lib/peer"

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente", paid: "Pagado", confirmed: "Confirmado", preparing: "En preparación",
  shipped: "Despachado", delivered: "Entregado", cancelled: "Cancelado",
}
const CONFIRMED = ["confirmed", "preparing", "shipped", "delivered", "paid"]

/**
 * Resumen de ESTA tienda en la forma común que intercambian las dos tiendas
 * hermanas. Lo usan /api/peer/summary (para Bienestar) y el comparador local.
 */
export async function buildSelfSummary(): Promise<PeerSummary> {
  const supabase = createServerClient()
  const [ordersRes, productsRes, subsRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id, created_at, customer_name, customer_email, customer_phone, shipping_address, items, total, status")
      .neq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("products").select("id, name, price, is_active, image_url").order("name").limit(300),
    supabase.from("subscribers").select("email, created_at").order("created_at", { ascending: false }).limit(500),
  ])
  if (ordersRes.error) throw new Error(ordersRes.error.message)

  type Row = {
    id: string; created_at: string; customer_name: string | null; customer_email: string | null;
    customer_phone: string | null; shipping_address: { city?: string } | null;
    items: { name?: string; quantity?: number; price?: number }[] | null;
    total: number; status: string;
  }
  const orders: PeerOrder[] = ((ordersRes.data || []) as Row[]).map(o => ({
    id: o.id,
    created_at: o.created_at,
    customer_name: o.customer_name || "—",
    phone: o.customer_phone || undefined,
    email: o.customer_email || undefined,
    city: o.shipping_address?.city || undefined,
    items: (o.items || []).map(i => ({ name: i.name || "Producto", qty: i.quantity || 1, price: i.price })),
    total: o.total,
    status: o.status,
    status_label: STATUS_LABEL[o.status] || o.status,
    confirmed: CONFIRMED.includes(o.status),
  }))

  return {
    store: SELF_STORE.id,
    name: SELF_STORE.name,
    url: "https://www.clichecolombia.com",
    currency: "COP",
    generated_at: new Date().toISOString(),
    orders,
    products: ((productsRes.data || []) as { id: string; name: string; price: number; is_active: boolean; image_url: string | null }[])
      .map(p => ({ id: p.id, name: p.name, price: p.price, active: p.is_active, image: p.image_url })),
    subscribers_count: (subsRes.data || []).length,
    subscribers: (subsRes.data || []) as { email: string; created_at: string }[],
  }
}
