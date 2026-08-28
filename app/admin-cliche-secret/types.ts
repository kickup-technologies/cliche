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
  carrier: string | null
}

export interface PageView { path: string; created_at: string }

export const PERIODS: { value: Period; label: string }[] = [
  { value: "1d", label: "Hoy" },
  { value: "7d", label: "7 días" },
  { value: "1m", label: "Este mes" },
  { value: "3m", label: "3 meses" },
  { value: "6m", label: "6 meses" },
  { value: "1y", label: "1 año" },
]

export const CONFIRMED = ["confirmed", "preparing", "shipped", "delivered", "paid"]

export const ORDER_STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:   { label: "Pendiente",      color: "text-yellow-700", bg: "bg-yellow-50",  border: "border-yellow-200" },
  paid:      { label: "Pagado",         color: "text-teal-700",   bg: "bg-teal-50",    border: "border-teal-200" },
  confirmed: { label: "Confirmado",     color: "text-blue-700",   bg: "bg-blue-50",    border: "border-blue-200" },
  preparing: { label: "En preparación", color: "text-[#A67163]",  bg: "bg-[#A67163]/10", border: "border-[#A67163]/20" },
  shipped:   { label: "Despachado",     color: "text-purple-700", bg: "bg-purple-50",  border: "border-purple-200" },
  delivered: { label: "Entregado",      color: "text-green-700",  bg: "bg-green-50",   border: "border-green-200" },
  // "cancelled" existe en el API desde siempre pero no tenía entrada aquí:
  // sin ella el dropdown no ofrecía cancelar y el badge salía en inglés crudo.
  cancelled: { label: "Cancelado",      color: "text-red-700",    bg: "bg-red-50",     border: "border-red-200" },
}

// Zona horaria del negocio: Colombia es UTC-5 y no tiene horario de verano.
// Todas las agrupaciones "por día" deben usar el día calendario de Bogotá,
// no el UTC del servidor/navegador: un pago a las 8 p. m. del viernes debe
// caer en la barra del viernes, no en la del sábado.
export function bogotaDay(d: Date | string): string {
  // "en-CA" formatea como YYYY-MM-DD, comparable lexicográficamente.
  return new Date(d).toLocaleDateString("en-CA", { timeZone: "America/Bogota" })
}

const DAY_MS = 86400000
// Colombia es UTC-5 fijo (sin horario de verano).
const BOGOTA_OFFSET_MS = 5 * 3600000

// Meses calendario que abarca cada periodo mensual (incluyendo el mes en curso).
const PERIOD_MONTHS: Partial<Record<Period, number>> = { "1m": 1, "3m": 3, "6m": 6, "1y": 12 }

// Date cuyo reloj UTC representa la hora de pared de Bogotá.
function bogotaWall(d: Date = new Date()): Date {
  return new Date(d.getTime() - BOGOTA_OFFSET_MS)
}
function wallToUtc(wall: Date): Date {
  return new Date(wall.getTime() + BOGOTA_OFFSET_MS)
}
// Instante UTC en que inicia el mes de Bogotá `monthsBack` meses atrás.
function bogotaMonthStart(monthsBack: number): Date {
  const w = bogotaWall()
  return wallToUtc(new Date(Date.UTC(w.getUTCFullYear(), w.getUTCMonth() - monthsBack, 1)))
}

// Los periodos son de calendario, no ventanas móviles: "1 mes" = el mes en
// curso (desde el día 1), "3 meses" = el mes actual + los 2 anteriores, etc.
// "Hoy" = desde la medianoche de Bogotá; "7 días" sigue siendo móvil.
export function cutoff(period: Period): Date {
  if (period === "1d") {
    const w = bogotaWall()
    return wallToUtc(new Date(Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate())))
  }
  if (period === "7d") return new Date(Date.now() - 7 * DAY_MS)
  return bogotaMonthStart(PERIOD_MONTHS[period]! - 1)
}

export function prevCutoff(period: Period): Date {
  if (period === "1d") return new Date(cutoff("1d").getTime() - DAY_MS)
  if (period === "7d") return new Date(Date.now() - 14 * DAY_MS)
  return bogotaMonthStart(2 * PERIOD_MONTHS[period]! - 1)
}

export function filterPeriod<T extends { created_at: string }>(items: T[], period: Period): T[] {
  const c = cutoff(period)
  return items.filter(i => new Date(i.created_at) >= c)
}

// El periodo anterior se compara contra el mismo tramo transcurrido (p. ej. a
// 28 de agosto: ago 1–28 vs jul 1–28), no contra el mes anterior completo —
// si no, a mitad de mes siempre saldría "caída" artificial.
export function filterPrevPeriod<T extends { created_at: string }>(items: T[], period: Period): T[] {
  const c = cutoff(period)
  const pc = prevCutoff(period)
  const end = new Date(pc.getTime() + (Date.now() - c.getTime()))
  return items.filter(i => { const d = new Date(i.created_at); return d >= pc && d < end })
}

export function fmt(n: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n)
}

export function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return null
  return ((curr - prev) / prev) * 100
}

// Medianoche (de pared) del día Bogotá en que cae el instante UTC `d`.
function wallMidnight(d: Date): number {
  const w = bogotaWall(d)
  return Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate())
}

// Dimensiones del periodo actual: cuántos días calendario Bogotá abarca
// (varía por mes: agosto a día 28 son 28 buckets) y con qué agrupación.
function periodShape(period: Period): { startMid: number; days: number; granularity: number } {
  const startMid = wallMidnight(cutoff(period))
  const days = Math.round((wallMidnight(new Date()) - startMid) / DAY_MS) + 1
  const granularity = days <= 31 ? 1 : days <= 92 ? 7 : 30
  return { startMid, days, granularity }
}

function buildRangeDailyData(
  orders: Order[], views: PageView[], startMid: number, days: number, granularity: number
): Array<{ label: string; revenue: number; orders: number; views: number }> {
  const result: Array<{ label: string; revenue: number; orders: number; views: number }> = []

  for (let i = 0; i < days; i += granularity) {
    const from = new Date(startMid + i * DAY_MS)
    const to = new Date(startMid + Math.min(i + granularity - 1, days - 1) * DAY_MS)
    // Buckets por día calendario de Bogotá (antes era UTC: las ventas de la
    // noche caían en el día siguiente y "Hoy" no cuadraba con los KPIs).
    // `from`/`to` ya son fechas de pared, por eso se formatean como UTC.
    const fromStr = from.toISOString().slice(0, 10)
    const toStr = to.toISOString().slice(0, 10)

    const periodOrders = orders.filter(o => {
      const d = bogotaDay(o.created_at)
      return d >= fromStr && d <= toStr && CONFIRMED.includes(o.status)
    })
    const periodViews = views.filter(v => {
      const d = bogotaDay(v.created_at)
      return d >= fromStr && d <= toStr
    })

    const label = granularity === 1
      ? to.toLocaleDateString("es-CO", { month: "short", day: "numeric", timeZone: "UTC" })
      : `${from.toLocaleDateString("es-CO", { month: "short", day: "numeric", timeZone: "UTC" })} – ${to.toLocaleDateString("es-CO", { day: "numeric", timeZone: "UTC" })}`

    result.push({
      label,
      revenue: periodOrders.reduce((s, o) => s + o.total, 0),
      orders: periodOrders.length,
      views: periodViews.length,
    })
  }
  return result
}

export function buildDailyData(
  orders: Order[], views: PageView[], period: Period
): Array<{ label: string; revenue: number; orders: number; views: number }> {
  const { startMid, days, granularity } = periodShape(period)
  return buildRangeDailyData(orders, views, startMid, days, granularity)
}

// Serie del periodo anterior con los MISMOS buckets que buildDailyData (mismo
// número de días y agrupación) para poder superponerla índice a índice.
export function buildPrevDailyData(
  orders: Order[], views: PageView[], period: Period
): Array<{ label: string; revenue: number; orders: number; views: number }> {
  const { days, granularity } = periodShape(period)
  const prevStartMid = wallMidnight(prevCutoff(period))
  return buildRangeDailyData(orders, views, prevStartMid, days, granularity)
}
