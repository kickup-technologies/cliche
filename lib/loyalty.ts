/** Niveles del Cliché Club (compartido entre la cuenta y el header). */
export const TIERS = [
  { name: "Plata", min: 0 },
  { name: "Oro", min: 300000 },
  { name: "Platino", min: 700000 },
] as const

export type Tier = { name: string; min: number }

export function tierOf(spent: number): { tier: Tier; next: Tier | undefined } {
  let idx = 0
  for (let i = TIERS.length - 1; i >= 0; i--) if (spent >= TIERS[i].min) { idx = i; break }
  return { tier: TIERS[idx], next: TIERS[idx + 1] }
}

/** Estados de pedido que cuentan como gasto acumulado para el nivel. */
export const SPENT_STATUSES = ["confirmed", "preparing", "shipped", "delivered", "paid"]
export const formatCOP = (n: number) => `$${(n || 0).toLocaleString("es-CO")}`
