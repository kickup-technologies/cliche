import { NextRequest, NextResponse } from "next/server"
import { isAdmin } from "@/lib/admin-auth"
import { peerKey, PEER_STORE } from "@/lib/peer"

export const dynamic = "force-dynamic"

/**
 * Proxy de gestión hacia la tienda hermana: el panel (autenticado aquí)
 * administra Bienestar de verdad — pedidos, productos, blog… — a través del
 * puente /api/peer-admin/* del otro lado.
 */
async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const key = peerKey()
  if (!key) return NextResponse.json({ error: "Conexión no configurada" }, { status: 503 })

  const { path } = await ctx.params
  const url = new URL(`/api/peer-admin/${(path || []).join("/")}`, PEER_STORE.url)
  url.search = req.nextUrl.search
  const init: RequestInit = {
    method: req.method,
    headers: { "Content-Type": "application/json", "x-peer-key": key },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  }
  if (req.method !== "GET" && req.method !== "HEAD") init.body = await req.text()
  try {
    const r = await fetch(url, init)
    const body = await r.text()
    return new NextResponse(body, { status: r.status, headers: { "Content-Type": r.headers.get("Content-Type") || "application/json" } })
  } catch (e) {
    return NextResponse.json({ error: `No se pudo contactar a ${PEER_STORE.name}: ${e instanceof Error ? e.message : "red"}` }, { status: 502 })
  }
}

export { proxy as GET, proxy as POST, proxy as PATCH, proxy as PUT, proxy as DELETE }
