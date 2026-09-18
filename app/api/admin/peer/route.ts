import { NextRequest, NextResponse } from "next/server"
import { isAdmin } from "@/lib/admin-auth"
import { peerKey, PEER_STORE, PeerSummary } from "@/lib/peer"

export const dynamic = "force-dynamic"

// Caché en memoria (60 s) para no golpear a la tienda hermana en cada refresco.
let cache: { at: number; data: PeerSummary } | null = null

/**
 * GET /api/admin/peer — resumen de la tienda hermana (Bienestar) para el
 * selector de tiendas del panel. Solo admins autenticados de ESTA tienda.
 */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  // ?self=1 → resumen LOCAL en la misma forma común (lo usa el comparador,
  // que necesita suscriptores y catálogo que /api/admin/data no incluye).
  if (req.nextUrl.searchParams.has("self")) {
    try {
      const { buildSelfSummary } = await import("@/lib/peer-summary")
      return NextResponse.json(await buildSelfSummary())
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Error de BD" }, { status: 502 })
    }
  }

  const key = peerKey()
  if (!key) {
    return NextResponse.json({ error: "Conexión no configurada: falta MERCADOPAGO_ACCESS_TOKEN o PEER_SYNC_SECRET" }, { status: 503 })
  }
  if (cache && Date.now() - cache.at < 60_000 && !req.nextUrl.searchParams.has("fresh")) {
    return NextResponse.json({ ...cache.data, cached: true })
  }
  try {
    const r = await fetch(`${PEER_STORE.url}/api/peer/summary`, {
      headers: { "x-peer-key": key },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    })
    const data = await r.json().catch(() => null)
    if (!r.ok || !data) {
      return NextResponse.json(
        { error: `La tienda hermana respondió ${r.status}${data?.error ? `: ${data.error}` : ""}` },
        { status: 502 },
      )
    }
    cache = { at: Date.now(), data }
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json(
      { error: `No se pudo contactar a ${PEER_STORE.name}: ${e instanceof Error ? e.message : "error de red"}` },
      { status: 502 },
    )
  }
}
