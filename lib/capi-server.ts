/**
 * Purchase server-side por la Conversions API de Meta.
 *
 * Se llama desde confirmPaidOrder (webhook/verify/reconcile) al confirmarse el
 * pago, así el Purchase llega a Meta AUNQUE el comprador nunca vuelva a
 * /gracias (muy común con PSE o pagando desde la app de Mercado Pago en móvil).
 *
 * Deduplicación: event_id = referencia del pedido. Si el navegador también
 * dispara Purchase en /gracias con ese mismo eventID, Meta descarta el
 * duplicado y cuenta UNA sola conversión.
 *
 * Reutiliza lib/meta-capi (mismo pixel id, token META_CAPI_TOKEN y hasheo
 * SHA-256 de email/teléfono que usa app/api/capi/route.ts).
 */

import { sendCAPIEvents, hashValue, normalizePhone, type CAPIUserData } from "@/lib/meta-capi"

type OrderItem = {
  product_id?: string
  quantity?: number
  name?: string
  kind?: string
  components?: Array<{ product_id?: string; quantity?: number }>
}

export type PurchaseOrder = {
  /** Referencia del pedido (stripe_session_id), ej. cliche_1234_ab1cd */
  reference: string
  total: number
  items: OrderItem[]
  customer_email?: string | null
  customer_phone?: string | null
}

export async function sendPurchaseCAPI(order: PurchaseOrder): Promise<void> {
  try {
    // Advanced Matching: email/teléfono SIEMPRE hasheados en el servidor
    // (mismo esquema que app/api/capi/route.ts — nunca viajan en claro a Meta).
    const user_data: CAPIUserData = {}
    if (order.customer_email) {
      user_data.em = [hashValue(order.customer_email)]
    }
    if (order.customer_phone) {
      const normalized = normalizePhone(order.customer_phone)
      if (normalized) user_data.ph = [hashValue(normalized)]
    }

    const items = Array.isArray(order.items) ? order.items : []
    // Mismos content_ids que envía el navegador desde /gracias (product_id por
    // línea, incluidos los "pack-*"), para que ambos eventos sean equivalentes.
    const content_ids = items
      .map((i) => i.product_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0)
    const num_items = items.reduce((s, i) => s + (Number(i.quantity) || 1), 0)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://clichecolombia.com"

    await sendCAPIEvents([
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_source_url: `${appUrl}/gracias?reference=${order.reference}`,
        // event_id = referencia → dedup con el fbq('track','Purchase') del navegador
        event_id: order.reference,
        action_source: "website",
        user_data,
        custom_data: {
          currency: "COP",
          value: Number(order.total) || 0,
          ...(content_ids.length > 0 && { content_ids }),
          content_type: "product",
          num_items,
        },
      },
    ])
  } catch (err) {
    // Nunca bloquear la confirmación del pedido por un fallo de analítica.
    console.error("[capi-server] error enviando Purchase:", err)
  }
}
