import { MercadoPagoConfig, Payment } from "mercadopago"

/** Cliente de Mercado Pago, o null si falta el access token. */
export function mpClient(): MercadoPagoConfig | null {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!accessToken) return null
  return new MercadoPagoConfig({ accessToken })
}

export type ApprovedPayment = {
  id: string
  reference: string
  email: string | null
  amount: number | null
}

/**
 * Busca en la API de Mercado Pago un pago APROBADO para una referencia
 * (external_reference = nuestra referencia de pedido). Devuelve el pago o null.
 *
 * Es la fuente de verdad autoritativa: no confiamos en la URL de retorno ni en
 * el cuerpo del webhook, sino en lo que Mercado Pago reporta con el access token.
 */
export async function findApprovedPayment(reference: string): Promise<ApprovedPayment | null> {
  const client = mpClient()
  if (!client) return null

  const res = await new Payment(client).search({ options: { external_reference: reference } })
  const results = res.results || []
  const approved = results.find((p) => p.status === "approved")
  if (!approved) return null

  return {
    id: String(approved.id),
    reference,
    email: approved.payer?.email || null,
    amount: typeof approved.transaction_amount === "number" ? approved.transaction_amount : null,
  }
}
