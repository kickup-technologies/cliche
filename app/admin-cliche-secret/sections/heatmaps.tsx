"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Flame, Snowflake, MousePointerClick, Eye, Activity, ThermometerSun,
  Users, MousePointer2, ArrowDownWideNarrow, Timer, AlertOctagon, Zap,
  Loader2, KeyRound, ExternalLink,
} from "lucide-react"
import { adminFetch } from "@/lib/admin-client"
import type { PageView } from "../types"

/**
 * Sección "Mapas de Calor" del panel admin.
 *
 * Herramienta gratuita: Microsoft Clarity (clarity.microsoft.com). El script de
 * grabación se carga en la tienda desde components/pixel-manager.tsx.
 *
 * Como el dashboard visual de Clarity NO se puede incrustar (X-Frame-Options:
 * SAMEORIGIN), aquí traemos las MÉTRICAS reales vía la Data Export API gratuita
 * (/api/admin/clarity) y las graficamos dentro del panel — sin redirigir.
 * Además mostramos un mapa de calor de navegación con nuestros propios datos.
 */

const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID || "x02j83u050"

// ── Tipos laxos para la respuesta de la API de Clarity ──────────────────────
type Info = Record<string, unknown>
type ClarityMetric = { metricName: string; information: Info[] }
type ClarityResponse = {
  configured: boolean
  metrics?: ClarityMetric[]
  error?: string
  detail?: string
}

const PATH_LABELS: Record<string, string> = {
  "/": "Inicio (Landing)",
  "/tienda": "Catálogo / Tienda",
  "/checkout": "Checkout (Pago)",
  "/gracias": "Confirmación de compra",
  "/pedido": "Seguimiento de pedido",
  "/cookies": "Política de Cookies",
  "/favoritos": "Favoritos",
}
function labelFor(path: string): string {
  if (PATH_LABELS[path]) return PATH_LABELS[path]
  if (path.startsWith("/producto")) return "Detalle de producto"
  if (path.startsWith("/pedido")) return "Seguimiento de pedido"
  return path
}

// Color por "temperatura" según un ratio 0..1 (1 = más caliente)
function tempColor(ratio: number): string {
  if (ratio > 0.75) return "#dc2626" // rojo — muy caliente
  if (ratio > 0.5) return "#f97316"  // naranja
  if (ratio > 0.3) return "#facc15"  // amarillo — templado
  if (ratio > 0.15) return "#38bdf8" // celeste
  return "#3b82f6"                    // azul — frío
}

// Lee el primer valor numérico disponible entre varias claves posibles
function pickNum(info: Info | undefined, ...keys: string[]): number | null {
  if (!info) return null
  for (const k of keys) {
    if (info[k] != null && info[k] !== "") {
      const n = Number(info[k])
      if (!Number.isNaN(n)) return n
    }
  }
  return null
}

export function HeatmapsSection({ pageViews }: { pageViews: PageView[] }) {
  const [clarity, setClarity] = useState<ClarityResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    adminFetch("/api/admin/clarity")
      .then((r) => r.json())
      .then((d) => { if (active) setClarity(d) })
      .catch(() => { if (active) setClarity({ configured: false }) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  // ── Parseo de métricas de Clarity ─────────────────────────────────────────
  const metrics = clarity?.metrics ?? []
  const byName = (name: string): Info[] =>
    metrics.find((m) => m.metricName === name)?.information ?? []

  const traffic = byName("Traffic")[0]
  const scroll = byName("ScrollDepth")[0]
  const engage = byName("EngagementTime")[0]

  const sessions = pickNum(traffic, "totalSessionCount", "totalSessions", "sessionsCount")
  const users = pickNum(traffic, "distinctUserCount", "distinctUsers", "uniqueUsers")
  const botPct = (() => {
    const bots = pickNum(traffic, "totalBotSessionCount", "botSessions")
    if (bots != null && sessions) return Math.round((bots / sessions) * 100)
    return null
  })()
  const pagesPerSession = pickNum(traffic, "pagesPerSessionPercentage", "pagesPerSession")
  const avgScroll = pickNum(scroll, "averageScrollDepth", "avgScrollDepth")
  const activeSec = pickNum(engage, "activeTime", "totalTime")

  const popularPages = byName("PopularPages")
    .map((p) => ({
      url: String(p.url ?? p.Url ?? p.pageUrl ?? "/"),
      visits: pickNum(p, "visitsCount", "totalSessionCount", "sessions", "count") ?? 0,
    }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 8)

  const deadClicks = pickNum(byName("DeadClickCount")[0], "subTotal", "totalCount") ?? 0
  const rageClicks = pickNum(byName("RageClickCount")[0], "subTotal", "totalCount") ?? 0
  const quickBack = pickNum(byName("QuickbackClick")[0], "subTotal", "totalCount") ?? 0

  const hasClarityData = clarity?.configured && (sessions != null || popularPages.length > 0)

  // ── Mapa de calor de navegación propio (page_views) ───────────────────────
  const ranking = useMemo(() => {
    const counts = new Map<string, number>()
    for (const pv of pageViews) {
      const path = (pv.path || "/").split("?")[0]
      counts.set(path, (counts.get(path) || 0) + 1)
    }
    const arr = Array.from(counts.entries())
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views)
    return { arr: arr.slice(0, 12), max: arr.length ? arr[0].views : 0, total: pageViews.length }
  }, [pageViews])

  const heatColor = (views: number) => {
    if (ranking.max === 0) return "#cbd5e1"
    const r = views / ranking.max
    if (r > 0.75) return "#dc2626"
    if (r > 0.5) return "#f97316"
    if (r > 0.3) return "#facc15"
    if (r > 0.15) return "#38bdf8"
    return "#3b82f6"
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-start gap-3">
        <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#dc2626] via-[#f97316] to-[#3b82f6] flex items-center justify-center flex-shrink-0">
          <ThermometerSun className="w-5 h-5 text-white" />
        </span>
        <div>
          <h2 className="text-xl font-bold text-[#2D1A14]">Mapas de Calor</h2>
          <p className="text-sm text-[#7a6a63]">
            Dónde miran, hacen clic y se detienen tus clientes — y dónde los pierdes.
          </p>
        </div>
      </div>

      {/* Métricas reales de Clarity (graficadas aquí, sin redirigir) */}
      {loading ? (
        <div className="rounded-2xl border border-[#ece2dc] bg-white p-8 flex items-center justify-center gap-2 text-sm text-[#9e8a84]">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando métricas de Clarity…
        </div>
      ) : hasClarityData ? (
        <>
          {/* Tarjetas de métricas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard icon={<Users className="w-4 h-4" />} label="Sesiones" value={sessions} />
            <MetricCard icon={<MousePointer2 className="w-4 h-4" />} label="Usuarios únicos" value={users} />
            <MetricCard icon={<ArrowDownWideNarrow className="w-4 h-4" />} label="Scroll promedio" value={avgScroll != null ? `${Math.round(avgScroll)}%` : null} />
            <MetricCard icon={<Timer className="w-4 h-4" />} label="Tiempo activo" value={activeSec != null ? `${Math.round(activeSec)}s` : null} />
          </div>

          {/* Señales de frustración (oro puro para vender más) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FrustrationCard icon={<MousePointerClick className="w-4 h-4 text-orange-500" />} label="Clics muertos" value={deadClicks} hint="Clican algo que no responde. Revísalo." />
            <FrustrationCard icon={<Zap className="w-4 h-4 text-red-500" />} label="Rage clicks" value={rageClicks} hint="Clican repetido por frustración. Hay un problema." />
            <FrustrationCard icon={<AlertOctagon className="w-4 h-4 text-amber-500" />} label="Rebotes rápidos" value={quickBack} hint="Entran y salen al instante. Página no convence." />
          </div>

          {/* Mapa visual de scroll: hasta dónde llega la gente (caliente vs frío) */}
          <ScrollDepthMap avgScroll={avgScroll} />

          {/* Páginas populares según Clarity (barras coloreadas por temperatura) */}
          {popularPages.length > 0 && (
            <div className="rounded-2xl border border-[#ece2dc] bg-white p-5">
              <p className="font-bold text-[#2D1A14] mb-1">Páginas más visitadas (Clarity)</p>
              <p className="text-xs text-[#9e8a84] mb-3">Rojo = más caliente (más visitada) · Azul = más fría.</p>
              <div className="space-y-2.5">
                {popularPages.map((p) => {
                  const max = popularPages[0].visits || 1
                  const pct = Math.round((p.visits / max) * 100)
                  const color = tempColor(p.visits / max)
                  return (
                    <div key={p.url} className="flex items-center gap-3">
                      <span className="w-48 text-xs text-[#2D1A14] truncate flex-shrink-0">{p.url}</span>
                      <div className="flex-1 h-5 rounded-full bg-[#f3ece9] overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, 6)}%`, backgroundColor: color }} />
                      </div>
                      <span className="w-12 text-right text-xs font-semibold text-[#6b5a54] flex-shrink-0">{p.visits}</span>
                    </div>
                  )
                })}
              </div>
              {botPct != null && (
                <p className="text-[11px] text-[#9e8a84] mt-3">Tráfico de bots detectado: {botPct}% · Páginas por sesión: {pagesPerSession ?? "—"}</p>
              )}
            </div>
          )}
        </>
      ) : (
        /* Sin token de API: instrucciones para conectar las gráficas */
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <KeyRound className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-[#2D1A14] text-sm">
                Conecta las gráficas de Clarity a este panel
              </p>
              <p className="text-xs text-[#6b5a54] mt-1 leading-relaxed">
                La grabación de heatmaps y sesiones <strong>ya está activa</strong> en la tienda.
                Para ver las métricas (sesiones, scroll, clics muertos, rage clicks) graficadas
                aquí dentro, genera un token gratuito:
              </p>
              <ol className="text-xs text-[#6b5a54] mt-2 space-y-1 list-decimal pl-4">
                <li>En Clarity → <strong>Configuración → Exportar datos</strong> → “Generar token de API”.</li>
                <li>Copia el token y agrégalo en Vercel como <code className="bg-white px-1 rounded">CLARITY_API_TOKEN</code>.</li>
                <li>Redeploy. Las gráficas aparecerán automáticamente.</li>
              </ol>
              {clarity?.error && (
                <p className="text-[11px] text-amber-700 mt-2">Detalle: {clarity.error}</p>
              )}
              <a
                href={`https://clarity.microsoft.com/projects/view/${CLARITY_ID}/settings`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-xs text-[#A67163] underline"
              >
                Abrir configuración de Clarity <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Qué significa el calor y el frío */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-red-100 bg-red-50/60 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-5 h-5 text-red-600" />
            <p className="font-bold text-[#2D1A14]">Zonas CALIENTES (rojo)</p>
          </div>
          <p className="text-sm text-[#6b5a54] leading-relaxed">
            Donde se concentran clics, movimiento y atención. Significa que ese elemento
            <strong> llama la atención y genera interés</strong>.
          </p>
          <ul className="text-xs text-[#7a6a63] mt-3 space-y-1.5 list-disc pl-4">
            <li>Botón de compra caliente → tu llamado a la acción funciona.</li>
            <li>Imagen caliente pero no clicable → conviene volverla un enlace.</li>
            <li>Mucho calor en el precio → es lo que más evalúan; resalta el valor.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Snowflake className="w-5 h-5 text-blue-600" />
            <p className="font-bold text-[#2D1A14]">Zonas FRÍAS (azul)</p>
          </div>
          <p className="text-sm text-[#6b5a54] leading-relaxed">
            Donde casi nadie mira ni interactúa. Ese contenido pasa
            <strong> desapercibido o aburre</strong>.
          </p>
          <ul className="text-xs text-[#7a6a63] mt-3 space-y-1.5 list-disc pl-4">
            <li>Botón “Comprar” frío → muévelo más arriba o hazlo más visible.</li>
            <li>Secciones frías largas → acórtalas; el cliente las salta.</li>
            <li>Frío a media página → ahí abandonan; pon lo importante antes.</li>
          </ul>
        </div>
      </div>

      {/* Para qué sirve */}
      <div className="rounded-2xl border border-[#ece2dc] bg-white p-5">
        <p className="font-bold text-[#2D1A14] mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#A67163]" /> ¿Para qué te sirve un mapa de calor?
        </p>
        <div className="grid sm:grid-cols-3 gap-3 text-xs text-[#6b5a54]">
          <div className="flex gap-2"><MousePointerClick className="w-4 h-4 text-[#A67163] flex-shrink-0" /><span>Descubres qué botones e imágenes generan clics y cuáles se ignoran.</span></div>
          <div className="flex gap-2"><Eye className="w-4 h-4 text-[#A67163] flex-shrink-0" /><span>Ves hasta dónde baja la gente (scroll) y dónde abandona.</span></div>
          <div className="flex gap-2"><Flame className="w-4 h-4 text-[#A67163] flex-shrink-0" /><span>Optimizas la tienda con datos reales para vender más, no por intuición.</span></div>
        </div>
      </div>

      {/* Mapa de calor de navegación (datos propios) */}
      <div className="rounded-2xl border border-[#ece2dc] bg-white p-5">
        <div className="flex items-center justify-between mb-1">
          <p className="font-bold text-[#2D1A14]">Mapa de calor de navegación</p>
          <span className="text-xs text-[#9e8a84]">{ranking.total} visitas registradas</span>
        </div>
        <p className="text-xs text-[#9e8a84] mb-4">
          Con tus propios datos: las páginas más visitadas se pintan calientes (rojo) y las menos, frías (azul).
        </p>
        {ranking.arr.length === 0 ? (
          <p className="text-sm text-[#9e8a84] py-6 text-center">Aún no hay visitas registradas para construir el mapa.</p>
        ) : (
          <div className="space-y-2.5">
            {ranking.arr.map(({ path, views }) => {
              const pct = ranking.max ? Math.round((views / ranking.max) * 100) : 0
              return (
                <div key={path} className="flex items-center gap-3">
                  <span className="w-40 text-xs text-[#2D1A14] truncate flex-shrink-0">{labelFor(path)}</span>
                  <div className="flex-1 h-5 rounded-full bg-[#f3ece9] overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, 6)}%`, backgroundColor: heatColor(views) }} />
                  </div>
                  <span className="w-12 text-right text-xs font-semibold text-[#6b5a54] flex-shrink-0">{views}</span>
                </div>
              )
            })}
          </div>
        )}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[#f0e8e4] text-[10px] text-[#9e8a84]">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: "#dc2626" }} /> Muy caliente</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: "#facc15" }} /> Templado</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: "#3b82f6" }} /> Frío</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Mapa visual de scroll: simula la página como una columna. Lo que la mayoría
 * alcanza a ver se pinta CALIENTE (rojo→amarillo); lo que se pierden, FRÍO/gris.
 * La línea marca el punto donde, en promedio, la gente deja de bajar.
 */
function ScrollDepthMap({ avgScroll }: { avgScroll: number | null }) {
  const seen = avgScroll != null ? Math.max(2, Math.min(100, Math.round(avgScroll))) : null

  let verdict: { title: string; tone: string; tip: string }
  if (seen == null) verdict = { title: "Sin datos de scroll aún", tone: "text-[#9e8a84]", tip: "Necesita algo de tráfico para calcular hasta dónde baja la gente." }
  else if (seen >= 75) verdict = { title: "Excelente alcance", tone: "text-red-600", tip: "La mayoría llega casi al final. Tus CTAs de abajo sí se ven." }
  else if (seen >= 50) verdict = { title: "Alcance medio", tone: "text-orange-500", tip: `Cerca del ${100 - seen}% inferior se lo pierden. Pon lo importante antes del ${seen}%.` }
  else if (seen >= 25) verdict = { title: "Alcance bajo", tone: "text-amber-500", tip: "Casi nadie ve la mitad de abajo. Mueve botones y oferta más arriba." }
  else verdict = { title: "Alcance crítico", tone: "text-blue-600", tip: "Abandonan apenas entran. Revisa el primer pantallazo (hero, carga, precio)." }

  return (
    <div className="rounded-2xl border border-[#ece2dc] bg-white p-5">
      <p className="font-bold text-[#2D1A14] mb-1">Mapa de scroll — ¿hasta dónde baja la gente?</p>
      <p className="text-xs text-[#9e8a84] mb-4">
        Simulación de tu página con el scroll promedio real de Clarity. La parte caliente es lo que sí ven; la fría/gris es lo que se pierden.
      </p>
      <div className="flex items-stretch gap-5">
        {/* Maqueta de la página */}
        <div className="relative w-28 sm:w-32 flex-shrink-0 rounded-xl overflow-hidden border border-[#e7dcd6]" style={{ height: 260 }}>
          {/* Gradiente de calor completo */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, #dc2626 0%, #f97316 30%, #facc15 55%, #38bdf8 80%, #3b82f6 100%)" }} />
          {/* Capa fría/gris sobre lo NO visto */}
          {seen != null && (
            <div className="absolute left-0 right-0 bottom-0 bg-[#1f2937]/70 backdrop-grayscale flex items-end justify-center pb-2" style={{ height: `${100 - seen}%` }}>
              <span className="text-[10px] text-white/80 font-medium">no lo ven</span>
            </div>
          )}
          {/* Línea de corte donde se detiene la mayoría */}
          {seen != null && (
            <div className="absolute left-0 right-0 flex items-center" style={{ top: `${seen}%` }}>
              <div className="flex-1 border-t-2 border-dashed border-white" />
              <span className="absolute -right-0 -translate-y-1/2 bg-white text-[10px] font-bold text-[#2D1A14] px-1.5 py-0.5 rounded-l-md shadow-sm">{seen}%</span>
            </div>
          )}
          {/* Etiqueta superior */}
          <span className="absolute top-1 left-0 right-0 text-center text-[10px] text-white font-medium drop-shadow">arriba (todos)</span>
        </div>

        {/* Lectura / interpretación */}
        <div className="flex-1 flex flex-col justify-center">
          <p className={`text-sm font-bold ${verdict.tone}`}>{verdict.title}</p>
          {seen != null && (
            <p className="text-3xl font-extrabold text-[#2D1A14] leading-none mt-1">{seen}%<span className="text-sm font-medium text-[#9e8a84] ml-1">de la página, en promedio</span></p>
          )}
          <p className="text-xs text-[#6b5a54] mt-2 leading-relaxed">{verdict.tip}</p>
          <div className="flex items-center gap-3 mt-3 text-[10px] text-[#9e8a84]">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: "#dc2626" }} /> Lo ven todos</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: "#3b82f6" }} /> Pocos llegan</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#1f2937]/70" /> No lo ven</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string | null }) {
  return (
    <div className="rounded-2xl border border-[#ece2dc] bg-white p-4">
      <div className="flex items-center gap-1.5 text-[#A67163] mb-2">{icon}<span className="text-[11px] font-medium text-[#9e8a84] uppercase tracking-wide">{label}</span></div>
      <p className="text-2xl font-bold text-[#2D1A14]">{value ?? "—"}</p>
    </div>
  )
}

function FrustrationCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: number; hint: string }) {
  return (
    <div className="rounded-2xl border border-[#ece2dc] bg-white p-4">
      <div className="flex items-center gap-1.5 mb-2">{icon}<span className="text-xs font-semibold text-[#2D1A14]">{label}</span></div>
      <p className="text-2xl font-bold text-[#2D1A14]">{value}</p>
      <p className="text-[11px] text-[#9e8a84] mt-1 leading-snug">{hint}</p>
    </div>
  )
}
