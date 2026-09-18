import { NextRequest, NextResponse } from "next/server"
import { verifyPeerKey } from "@/lib/peer"
import { buildSelfSummary } from "@/lib/peer-summary"
import { rateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

/**
 * GET /api/peer/summary — resumen de esta tienda para el panel de la tienda
 * hermana (Bienestar). Solo lectura, protegido por la llave compartida
 * (derivada del token de MP que ambas tiendas comparten — ver lib/peer.ts).
 */
export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { id: "peer-summary", limit: 30, windowMs: 60_000 })
  if (limited) return limited
  if (!verifyPeerKey(req.headers.get("x-peer-key"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  try {
    return NextResponse.json(await buildSelfSummary())
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error de BD" }, { status: 502 })
  }
}
