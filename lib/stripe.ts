import Stripe from "stripe"

// Cliente de Stripe (lazy — no se instancia en build time, solo en runtime)
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error("STRIPE_SECRET_KEY no está configurada")
    _stripe = new Stripe(key, { apiVersion: "2025-02-24.acacia" })
  }
  return _stripe
}

// Formatea precio COP para Stripe (Stripe usa centavos)
// NOTA: COP no tiene centavos decimales, Stripe lo acepta como unidad entera
export function toStripeAmount(copAmount: number): number {
  return copAmount // COP = moneda de cero decimales en Stripe
}

export function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(amount)
}
