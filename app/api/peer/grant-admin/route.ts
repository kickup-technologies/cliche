import { NextRequest, NextResponse } from "next/server"
import { verifyPeerKey } from "@/lib/peer"
import { signAdminToken } from "@/lib/admin-auth"
import { rateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

/**
 * POST /api/peer/grant-admin — URL de un solo uso (token firmado, 2 min) que
 * abre ESTE panel ya autenticado, para el botón "Abrir panel completo" del
 * panel de Bienestar. Misma dueña, misma lista de admins.
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { id: "peer-grant", limit: 10, windowMs: 60_000 })
  if (limited) return limited
  if (!verifyPeerKey(req.headers.get("x-peer-key"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  try {
    const token = signAdminToken("panel@bienestar-peer", 2 * 60_000, true)
    const url = new URL("/api/admin/peer-unlock", req.nextUrl.origin)
    url.searchParams.set("token", token)
    return NextResponse.json({ url: url.toString() })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 503 })
  }
}
