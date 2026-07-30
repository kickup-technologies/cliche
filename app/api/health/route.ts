import { NextResponse } from "next/server"

/**
 * GET /api/health — latido de producción.
 *
 * Devuelve el commit que está corriendo (VERCEL_GIT_COMMIT_SHA). Lo usa el
 * workflow verify-deploy para detectar pushes que Vercel rechazó en silencio
 * (nos pasó el 2026-07-30: un vercel.json inválido para el plan Hobby dejó
 * producción congelada en un commit viejo sin que nadie lo notara).
 */
export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      sha: process.env.VERCEL_GIT_COMMIT_SHA || null,
      env: process.env.VERCEL_ENV || null,
    },
    { headers: { "Cache-Control": "no-store" } },
  )
}
