import { createHmac, timingSafeEqual } from "crypto"

/**
 * Conexión entre las dos tiendas hermanas (Cliché ↔ Bienestar).
 *
 * Cada tienda expone /api/peer/summary (solo lectura) protegido por una llave
 * compartida, y su panel admin consulta a la otra vía /api/admin/peer.
 *
 * La llave NO requiere configurar nada nuevo: se deriva por HMAC del access
 * token de Mercado Pago, que ambas tiendas ya comparten (misma cuenta MP).
 * Si algún día los tokens divergen, basta definir PEER_SYNC_SECRET (el mismo
 * valor) en los dos proyectos de Vercel y esa env manda.
 */

export const PEER_STORE = {
  id: "bienestar",
  name: "Bienestar by Cliché",
  url: process.env.PEER_STORE_URL || "https://www.bienestarbycliche.com",
}

export const SELF_STORE = { id: "cliche", name: "Cliché Colombia" }

export function peerKey(): string | null {
  if (process.env.PEER_SYNC_SECRET) return process.env.PEER_SYNC_SECRET
  const seed = process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN
  if (!seed) return null
  return createHmac("sha256", seed).update("cliche<->bienestar peer v1").digest("hex")
}

/** Valida la cabecera x-peer-key en tiempo constante. Falla cerrado sin llave. */
export function verifyPeerKey(header: string | null): boolean {
  const real = peerKey()
  if (!real || !header) return false
  const a = Buffer.from(header)
  const b = Buffer.from(real)
  if (a.length !== b.length) { timingSafeEqual(a, a); return false }
  return timingSafeEqual(a, b)
}

/** Forma común del resumen que intercambian las dos tiendas. */
export type PeerOrder = {
  id: string; created_at: string; customer_name: string; phone?: string; email?: string;
  city?: string; items: { name: string; qty: number; price?: number }[];
  total: number; status: string; status_label: string; confirmed: boolean; payment_method?: string;
}

/** Números EXACTOS calculados por la BD (admin_store_stats): todo el
 *  histórico, no la muestra de 200 pedidos que viaja en `orders`. */
export type PeerStatsWindow = { orders: number; revenue: number; prev_orders: number; prev_revenue: number }
// Ventanas de CALENDARIO Bogotá — las mismas definiciones que usan los
// paneles de las dos tiendas, para que las cifras coincidan 1:1.
export type PeerStats = { unique_customers: number; windows: Record<"1d" | "7d" | "1m" | "3m" | "6m" | "1y" | "all", PeerStatsWindow> }

export type PeerSummary = {
  stats?: PeerStats | null;
  store: string; name: string; url: string; currency: "COP"; generated_at: string;
  orders: PeerOrder[];
  products: { id: string; name: string; price: number; active: boolean; image?: string | null }[];
  subscribers_count: number;
  subscribers: { email: string; created_at: string }[];
}
