import { NextRequest, NextResponse } from "next/server"
import { verifyPeerKey } from "@/lib/peer"
import { ADMIN_COOKIE, signAdminToken } from "@/lib/admin-auth"
import { rateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

/**
 * Puente de administración entre tiendas: el panel de Bienestar administra
 * ESTA tienda (pedidos, productos…) reutilizando las APIs admin reales.
 *
 * Seguridad: llave compartida entre tiendas (lib/peer.ts) + allowlist de
 * rutas. Internamente se auto-consulta /api/admin/<ruta> con un token admin
 * propio de vida corta — la lógica de negocio vive UNA sola vez.
 */

const ALLOWED = ["orders", "products", "customers"]

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const limited = rateLimit(req, { id: "peer-admin", limit: 120, windowMs: 60_000 })
  if (limited) return limited
  if (!verifyPeerKey(req.headers.get("x-peer-key"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const { path } = await ctx.params
  const joined = (path || []).join("/")
  if (!ALLOWED.some(p => joined === p || joined.startsWith(`${p}/`))) {
    return NextResponse.json({ error: "Ruta no permitida" }, { status: 403 })
  }

  const url = new URL(`/api/admin/${joined}`, req.nextUrl.origin)
  url.search = req.nextUrl.search
  const init: RequestInit = {
    method: req.method,
    headers: {
      "Content-Type": "application/json",
      cookie: `${ADMIN_COOKIE}=${signAdminToken("panel@bienestar-peer", 2 * 60_000, true)}`,
    },
    cache: "no-store",
  }
  if (req.method !== "GET" && req.method !== "HEAD") init.body = await req.text()
  const r = await fetch(url, init)
  const body = await r.text()
  return new NextResponse(body, { status: r.status, headers: { "Content-Type": r.headers.get("Content-Type") || "application/json" } })
}

export { proxy as GET, proxy as POST, proxy as PATCH, proxy as PUT, proxy as DELETE }
