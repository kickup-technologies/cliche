import Stripe from "stripe"

// Cliente de Stripe (server-side)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
})

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
