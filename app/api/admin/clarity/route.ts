import { NextRequest, NextResponse } from "next/server"
import { isAdmin } from "@/lib/admin-auth"

/**
 * GET /api/admin/clarity
 *
 * Proxy de la Data Export API (gratuita) de Microsoft Clarity. Trae las
 * métricas reales del proyecto (tráfico, scroll, clics muertos, rage clicks,
 * páginas populares, etc.) para graficarlas DENTRO del panel admin, sin tener
 * que redirigir al dashboard de Clarity (que además no se puede incrustar por
 * su X-Frame-Options: SAMEORIGIN).
 *
 * Requiere la variable de entorno CLARITY_API_TOKEN (un JWT que se genera en
 * Clarity → Configuración → Exportar datos → "Generar nuevo token de API").
 * Es un secreto, por eso vive en el entorno y nunca en el código.
 *
 * Límites de la API de Clarity: ~10 llamadas/día y máximo los últimos 3 días.
 */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const token = process.env.CLARITY_API_TOKEN
  if (!token) {
    // Sin token: la sección usará su heatmap de navegación propio y mostrará
    // instrucciones para conectar la API.
    return NextResponse.json({ configured: false }, { status: 200 })
  }

  const numOfDays = Math.min(Math.max(Number(req.nextUrl.searchParams.get("days") ?? 3), 1), 3)

  try {
    const url = `https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=${numOfDays}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => "")
      return NextResponse.json(
        {
          configured: true,
          error: `Clarity respondió ${res.status}. Revisa el token o el límite diario de llamadas.`,
          detail: detail.slice(0, 300),
        },
        { status: 200 }
      )
    }

    const data = await res.json()
    return NextResponse.json({ configured: true, numOfDays, metrics: data }, { status: 200 })
  } catch (err) {
    return NextResponse.json(
      { configured: true, error: "No se pudo contactar la API de Clarity.", detail: String(err).slice(0, 200) },
      { status: 200 }
    )
  }
}
