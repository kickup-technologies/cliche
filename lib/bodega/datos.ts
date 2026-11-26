/** De los pedidos de la tienda a las filas de la bodega, y los cambios de vuelta. */
import { cookies } from "next/headers"
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin-auth"
import { createServerClient } from "@/lib/supabase"
import { CARRIERS } from "@/lib/carriers"
import { ESTADO_COD_NUEVO, esContraentrega } from "@/lib/contraentrega"
import { PRODUCTOS_DROPI } from "@/lib/dropi-productos"
import { descontarStockPedido } from "@/lib/orders/stock"
import { sendOrderShippedEmail } from "@/lib/mailer"
import { leerEstado, leerEstados } from "./almacen"
import { fila, type EstadoBodega, type FilaBodega, type PedidoBase } from "./reglas"
import type { ParaVerificar } from "./huella"

export const sesion = async () => verifyAdminToken((await cookies()).get(ADMIN_COOKIE)?.value)

type Linea = { kind?: string; product_id?: string; name?: string; quantity?: number; units?: number; components?: Array<{ product_id: string; name?: string; quantity: number }> }
type Orden = {
  id: string; status: string; total: number; created_at: string; stripe_session_id: string | null
  customer_name: string | null; customer_phone: string | null; customer_email: string | null
  shipping_address: { address?: string; city?: string; department?: string } | null
  carrier: string | null; tracking_number: string | null; items: Linea[] | null
}
const CAMPOS = "id, status, total, created_at, stripe_session_id, customer_name, customer_phone, customer_email, shipping_address, carrier, tracking_number, items"
type Producto = { id: string; name: string; slug: string }

async function productos() {
  const { data } = await createServerClient().from("products").select("id, name, slug")
  return new Map(((data ?? []) as Producto[]).map((p) => [p.id, p]))
}

/** Frascos por aroma: un kit x4 son 4 unidades del mismo producto. */
function frascos(items: Linea[] | null) {
  const out: Array<{ id: string; nombre: string; qty: number }> = []
  for (const it of items ?? []) {
    if (it.kind === "pack") for (const c of it.components ?? []) out.push({ id: c.product_id, nombre: c.name || "Aroma", qty: c.quantity * (it.quantity || 1) })
    else if (it.product_id) out.push({ id: it.product_id, nombre: (it.name || "Aroma").replace(/ — Kit x\d+$/, ""), qty: (it.quantity || 1) * (it.units || 1) })
  }
  return out
}

function base(o: Orden, porId: Map<string, Producto>): PedidoBase {
  const d = o.shipping_address ?? {}
  return {
    id: o.id, ref: (o.stripe_session_id || o.id).slice(-8).toUpperCase(), fecha: o.created_at,
    cliente: o.customer_name ?? "", celular: o.customer_phone ?? "",
    departamento: d.department ?? "", ciudad: d.city ?? "", direccion: d.address ?? "",
    pagado: !esContraentrega(o.stripe_session_id),
    items: frascos(o.items).map((f) => ({ nombre: (porId.get(f.id)?.name || f.nombre).replace(/^Aroma /, "").split(" — ")[0], ref: "250 ml", qty: f.qty })),
    confirmado: o.status !== ESTADO_COD_NUEVO,
    despachado: o.status === "shipped" || o.status === "delivered",
    transportadora: o.carrier ?? "", guia: o.tracking_number ?? "",
  }
}

export async function filas(): Promise<FilaBodega[]> {
  const desde = new Date(Date.now() - 60 * 86400_000).toISOString()
  const { data, error } = await createServerClient().from("orders").select(CAMPOS)
    .neq("status", "pending").neq("status", "cancelled").gte("created_at", desde)
    .order("created_at", { ascending: false }).limit(500)
  if (error) throw new Error(error.message)
  const ordenes = (data ?? []) as Orden[]
  const [porId, estados] = await Promise.all([productos(), leerEstados(ordenes.map((o) => o.id))])
  return ordenes.map((o) => fila(base(o, porId), estados.get(o.id)))
}

async function orden(id: string) {
  const { data } = await createServerClient().from("orders").select(CAMPOS).eq("id", id).single()
  return data as Orden | null
}

export async function paraVerificar(id: string): Promise<ParaVerificar | null> {
  const o = await orden(id)
  if (!o) return null
  const porId = await productos()
  const lista = frascos(o.items)
  const unidades = lista.reduce((n, f) => n + f.qty, 0) || 1
  const conDropi = lista.map((f) => ({ f, d: PRODUCTOS_DROPI[porId.get(f.id)?.slug ?? ""] }))
  return {
    celular: o.customer_phone ?? "", ciudad: o.shipping_address?.city ?? "", departamento: o.shipping_address?.department ?? "",
    contraentrega: esContraentrega(o.stripe_session_id),
    productos: conDropi.every((x) => x.d) ? conDropi.map(({ f, d }) => ({ id: d.id, type: "SIMPLE" as const, quantity: f.qty, price: Math.round(o.total / unidades) })) : [],
  }
}

/** Refleja en la tienda lo que hizo la bodega (estado, guía y correo de «en camino»). */
export async function actualizarPedido(id: string, accion: "confirmado" | "despachado" | null, estado: EstadoBodega = {}) {
  const db = createServerClient()
  const antes = await orden(id)
  if (!antes) return
  const cambios: Record<string, unknown> = {}
  if (accion === "confirmado" && [ESTADO_COD_NUEVO, "confirmed", "paid"].includes(antes.status)) cambios.status = "preparing"
  if (accion === "despachado" && !["shipped", "delivered", "cancelled"].includes(antes.status)) cambios.status = "shipped"
  const guia = estado.guia || (await leerEstado(id)).guia
  if (guia) cambios.tracking_number = guia
  if (estado.transportadora && CARRIERS.some((c) => c.id === estado.transportadora)) cambios.carrier = estado.transportadora
  if (!Object.keys(cambios).length) return
  const { data, error } = await db.from("orders").update(cambios).eq("id", id).eq("status", antes.status).select(CAMPOS)
  const despues = data?.[0] as Orden | undefined
  if (error || !despues) return
  if (antes.status === ESTADO_COD_NUEVO && cambios.status && esContraentrega(antes.stripe_session_id)) {
    await descontarStockPedido(db, (antes.items ?? []) as never, antes.stripe_session_id!)
  }
  if (cambios.status === "shipped" && despues.customer_email) {
    await sendOrderShippedEmail(despues.customer_email, {
      id: despues.stripe_session_id || despues.id, customerName: despues.customer_name,
      trackingNumber: despues.tracking_number, carrier: despues.carrier, items: (despues.items || []) as never,
    }).catch((e: unknown) => console.error("[bodega] correo de envío:", e))
  }
}
