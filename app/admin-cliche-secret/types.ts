export type Period = "1d" | "7d" | "1m" | "3m" | "6m" | "1y"

export interface Order {
  id: string
  stripe_session_id: string | null
  customer_email: string | null
  customer_name: string | null
  customer_phone: string | null
  customer_id_number: string | null
  total: number
  status: string
  created_at: string
  items: Array<{
    name?: string
    product_id?: string
    quantity: number
    price?: number
    kind?: "unit" | "pack"
    tier?: string
    components?: Array<{ product_id: string; name: string; quantity: number }>
  }>
  shipping_address: { address?: string; city?: string; department?: string; notes?: string } | null
  discount_code: string | null
  discount_amount: number
  tracking_number: string | null
}

export interface PageView { path: string; created_at: string }

export const PERIOD_DAYS: Record<Period, number> = { "1d": 1, "7d": 7, "1m": 30, "3m": 90, "6m": 180, "1y": 365 }

export const PERIODS: { value: Period; label: string }[] = [
  { value: "1d", label: "Hoy" },
  { value: "7d", label: "7 días" },
  { value: "1m", label: "1 mes" },
  { value: "3m", label: "3 meses" },
  { value: "6m", label: "6 meses" },
  { value: "1y", label: "1 año" },
]

export const CONFIRMED = ["confirmed", "preparing", "shipped", "delivered", "paid"]

export const ORDER_STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:   { label: "Pendiente",      color: "text-yellow-700", bg: "bg-yellow-50",  border: "border-yellow-200" },
  confirmed: { label: "Confirmado",     color: "text-blue-700",   bg: "bg-blue-50",    border: "border-blue-200" },
  preparing: { label: "En preparación", color: "text-[#A67163]",  bg: "bg-[#A67163]/10", border: "border-[#A67163]/20" },
  shipped:   { label: "Despachado",     color: "text-purple-700", bg: "bg-purple-50",  border: "border-purple-200" },
  delivered: { label: "Entregado",      color: "text-green-700",  bg: "bg-green-50",   border: "border-green-200" },
}

export function cutoff(period: Period): Date {
  return new Date(Date.now() - PERIOD_DAYS[period] * 86400000)
}

export function prevCutoff(period: Period): Date {
  return new Date(Date.now() - PERIOD_DAYS[period] * 2 * 86400000)
}

export function filterPeriod<T extends { created_at: string }>(items: T[], period: Period): T[] {
  const c = cutoff(period)
  return items.filter(i => new Date(i.created_at) >= c)
}

export function filterPrevPeriod<T extends { created_at: string }>(items: T[], period: Period): T[] {
  const c = cutoff(period)
  const pc = prevCutoff(period)
  return items.filter(i => { const d = new Date(i.created_at); return d >= pc && d < c })
}

export function fmt(n: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n)
}

export function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return null
  return ((curr - prev) / prev) * 100
}

export function buildDailyData(
  orders: Order[], views: PageView[], period: Period
): Array<{ label: string; revenue: number; orders: number; views: number }> {
  const days = PERIOD_DAYS[period]
  const granularity = days <= 30 ? 1 : days <= 90 ? 7 : 30
  const result: Array<{ label: string; revenue: number; orders: number; views: number }> = []

  for (let i = days - 1; i >= 0; i -= granularity) {
    const to = new Date(Date.now() - i * 86400000)
    const from = new Date(Date.now() - Math.min(i + granularity - 1, days - 1) * 86400000)
    const fromStr = from.toISOString().slice(0, 10)
    const toStr = to.toISOString().slice(0, 10)

    const periodOrders = orders.filter(o => {
      const d = o.created_at.slice(0, 10)
      return d >= fromStr && d <= toStr && CONFIRMED.includes(o.status)
    })
    const periodViews = views.filter(v => {
      const d = v.created_at.slice(0, 10)
      return d >= fromStr && d <= toStr
    })

    const label = granularity === 1
      ? to.toLocaleDateString("es-CO", { month: "short", day: "numeric" })
      : `${from.toLocaleDateString("es-CO", { month: "short", day: "numeric" })} – ${to.toLocaleDateString("es-CO", { day: "numeric" })}`

    result.push({
      label,
      revenue: periodOrders.reduce((s, o) => s + o.total, 0),
      orders: periodOrders.length,
      views: periodViews.length,
    })
  }
  return result
}
