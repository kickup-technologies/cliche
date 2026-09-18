import { NextRequest, NextResponse } from "next/server"
import { verifyPeerKey } from "@/lib/peer"
import { adminEmails, dbAdminEmails } from "@/lib/admin-auth"
import { rateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

/**
 * GET /api/peer/admins — lista de correos con acceso admin en Cliché
 * (envs ADMIN_EMAIL/ADMIN_EMAILS ∪ site_settings.admin_emails_extra).
 * La usa el panel de Bienestar para permitir el acceso EXCLUSIVAMENTE a los
 * mismos correos que administran Cliché. Protegido por la llave entre tiendas.
 */
export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { id: "peer-admins", limit: 30, windowMs: 60_000 })
  if (limited) return limited
  if (!verifyPeerKey(req.headers.get("x-peer-key"))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  try {
    const extra = await dbAdminEmails().catch(() => [])
    const emails = [...new Set([...adminEmails(), ...extra])]
    return NextResponse.json({ emails })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 502 })
  }
}
