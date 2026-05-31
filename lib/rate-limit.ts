import { NextRequest, NextResponse } from "next/server"

/**
 * Rate limiter en memoria (sliding window simple).
 *
 * NOTA: en Vercel serverless el estado es POR-INSTANCIA, así que el límite
 * efectivo se multiplica por el número de instancias activas. Es suficiente
 * para frenar abuso/brute-force/spam básico sin dependencias externas.
 * Para protección estricta y distribuida, migrar a Upstash Ratelimit
 * (@upstash/ratelimit + @upstash/redis) usando la misma firma `rateLimit()`.
 */
type Bucket = { count: number; resetAt: number }
const store = new Map<string, Bucket>()

// Limpieza periódica para no crecer sin límite
let lastSweep = Date.now()
function sweep(now: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [k, b] of store) if (b.resetAt <= now) store.delete(k)
}

export function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0].trim()
  return req.headers.get("x-real-ip") || "unknown"
}

/**
 * Devuelve null si la petición está permitida, o una NextResponse 429 si se
 * excedió el límite. Uso:
 *   const limited = rateLimit(req, { id: "checkout", limit: 10, windowMs: 60_000 })
 *   if (limited) return limited
 */
export function rateLimit(
  req: NextRequest,
  opts: { id: string; limit: number; windowMs: number }
): NextResponse | null {
  const now = Date.now()
  sweep(now)

  const key = `${opts.id}:${clientIp(req)}`
  const bucket = store.get(key)

  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + opts.windowMs })
    return null
  }

  if (bucket.count >= opts.limit) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000)
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo en un momento." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    )
  }

  bucket.count++
  return null
}
