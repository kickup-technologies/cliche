import { NextRequest, NextResponse } from "next/server"
import { isAdmin } from "@/lib/admin-auth"
import { peerKey, PEER_STORE } from "@/lib/peer"

export const dynamic = "force-dynamic"

/**
 * POST /api/admin/peer-login — pide a Bienestar una URL de acceso directo a
 * SU panel nativo (botón "Abrir panel completo de Bienestar").
 */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const key = peerKey()
  if (!key) return NextResponse.json({ error: "Conexión no configurada" }, { status: 503 })
  try {
    const r = await fetch(`${PEER_STORE.url}/api/peer/grant-admin`, {
      method: "POST",
      headers: { "x-peer-key": key },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    })
    const data = await r.json().catch(() => null)
    if (!r.ok || !data?.url) return NextResponse.json({ error: data?.error || `Error ${r.status}` }, { status: 502 })
    return NextResponse.json({ url: data.url })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error de red" }, { status: 502 })
  }
}
