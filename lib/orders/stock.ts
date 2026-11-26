import type { SupabaseClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

type Item = {
  kind?: string
  product_id?: string
  quantity?: number
  units?: number
  components?: Array<{ product_id: string; quantity: number }>
}

/**
 * Descuenta el inventario de un pedido contra entrega cuando el equipo lo
 * confirma (los pagados en línea lo descuentan en confirmPaidOrder). Los kits
 * descuentan cada frasco. Nunca bloquea el cambio de estado.
 */
export async function descontarStockPedido(db: SupabaseClient, items: Item[], reference: string) {
  const bajar = async (product_id: string, qty: number) => {
    if (!product_id || qty <= 0) return
    const { error } = await db.rpc("decrement_stock", { p_product_id: product_id, p_quantity: qty })
    if (error) throw error
  }
  try {
    for (const item of items) {
      if (item.kind === "pack" && Array.isArray(item.components)) {
        for (const c of item.components) await bajar(c.product_id, (Number(c.quantity) || 0) * (Number(item.quantity) || 1))
      } else if (item.product_id) {
        await bajar(item.product_id, (Number(item.quantity) || 0) * (Number(item.units) || 1))
      }
    }
    revalidatePath("/productos/[slug]", "page")
    revalidatePath("/catalogo")
  } catch (err) {
    console.error(`[cod] fallo descontando stock del pedido ${reference}:`, err)
  }
}
