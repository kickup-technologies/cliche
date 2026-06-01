"use client"

import { useMemo } from "react"
import {
  Flame, Snowflake, ExternalLink, MousePointerClick, Eye, Activity,
  CheckCircle2, AlertTriangle, MonitorPlay, ThermometerSun,
} from "lucide-react"
import type { PageView } from "../types"

/**
 * Sección "Mapas de Calor" del panel admin.
 *
 * Herramienta gratuita usada: Microsoft Clarity (clarity.microsoft.com).
 * Es 100% gratis, sin límite de tráfico, e incluye heatmaps + grabaciones
 * de sesión. Se carga en la tienda desde components/pixel-manager.tsx cuando
 * el visitante acepta cookies analíticas y existe NEXT_PUBLIC_CLARITY_ID.
 *
 * Esta sección:
 *  1. Explica qué significa el calor (rojo) y el frío (azul) del mapa.
 *  2. Da acceso directo al dashboard de Clarity.
 *  3. Muestra un "mapa de calor de navegación" propio, derivado de los
 *     page_views ya registrados, para tener valor inmediato.
 */

const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID || "x02j83u050"

// Etiquetas legibles para las rutas conocidas de la tienda
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

export function HeatmapsSection({ pageViews }: { pageViews: PageView[] }) {
  const ranking = useMemo(() => {
    const counts = new Map<string, number>()
    for (const pv of pageViews) {
      const path = (pv.path || "/").split("?")[0]
      counts.set(path, (counts.get(path) || 0) + 1)
    }
    const arr = Array.from(counts.entries())
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views)
    const max = arr.length ? arr[0].views : 0
    return { arr: arr.slice(0, 12), max, total: pageViews.length }
  }, [pageViews])

  // Color cálido→frío según intensidad relativa (rojo = caliente, azul = frío)
  const heatColor = (views: number) => {
    if (ranking.max === 0) return "#cbd5e1"
    const r = views / ranking.max
    if (r > 0.75) return "#dc2626" // rojo intenso — muy caliente
    if (r > 0.5) return "#f97316" // naranja — caliente
    if (r > 0.3) return "#facc15" // amarillo — templado
    if (r > 0.15) return "#38bdf8" // azul claro — frío
    return "#3b82f6" // azul — muy frío
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
            Visualiza dónde miran, hacen clic y se detienen tus clientes — y dónde los pierdes.
          </p>
        </div>
      </div>

      {/* Estado de la herramienta */}
      <div
        className={`rounded-2xl border p-5 ${
          CLARITY_ID
            ? "bg-green-50 border-green-200"
            : "bg-amber-50 border-amber-200"
        }`}
      >
        <div className="flex items-start gap-3">
          {CLARITY_ID ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-semibold text-[#2D1A14] text-sm">
              {CLARITY_ID
                ? "Microsoft Clarity está activo y grabando"
                : "Microsoft Clarity aún no está conectado"}
            </p>
            <p className="text-xs text-[#6b5a54] mt-1 leading-relaxed">
              {CLARITY_ID ? (
                <>
                  Los heatmaps y las grabaciones de sesión se capturan automáticamente
                  cuando el visitante acepta cookies analíticas. Abre el panel de Clarity
                  para ver los mapas completos.
                </>
              ) : (
                <>
                  Es <strong>gratis e ilimitado</strong>. Crea una cuenta en{" "}
                  <a
                    href="https://clarity.microsoft.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-[#A67163]"
                  >
                    clarity.microsoft.com
                  </a>
                  , crea un proyecto para esta tienda, copia el <strong>Project ID</strong> y
                  agrégalo en Vercel como <code className="bg-white px-1 rounded">NEXT_PUBLIC_CLARITY_ID</code>.
                  Al hacer redeploy, empezará a grabar.
                </>
              )}
            </p>
            <a
              href={CLARITY_ID ? `https://clarity.microsoft.com/projects/view/${CLARITY_ID}/heatmaps` : "https://clarity.microsoft.com"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-full bg-[#A67163] text-white text-xs font-semibold hover:bg-[#8f5e51] transition-colors"
            >
              <MonitorPlay className="w-3.5 h-3.5" />
              {CLARITY_ID ? "Abrir mapas de calor en Clarity" : "Crear cuenta gratis en Clarity"}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Qué significa el calor y el frío */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-red-100 bg-red-50/60 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-5 h-5 text-red-600" />
            <p className="font-bold text-[#2D1A14]">Zonas CALIENTES (rojo)</p>
          </div>
          <p className="text-sm text-[#6b5a54] leading-relaxed">
            Donde se concentran clics, movimiento de mouse y atención. Significa que
            ese elemento <strong>llama la atención y genera interés</strong>.
          </p>
          <ul className="text-xs text-[#7a6a63] mt-3 space-y-1.5 list-disc pl-4">
            <li>Si un botón de compra está caliente → tu llamado a la acción funciona.</li>
            <li>Si una imagen está caliente pero no es clicable → conviene volverla un enlace.</li>
            <li>Mucho calor en el precio → es lo que más evalúan; prueba resaltar el valor.</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Snowflake className="w-5 h-5 text-blue-600" />
            <p className="font-bold text-[#2D1A14]">Zonas FRÍAS (azul)</p>
          </div>
          <p className="text-sm text-[#6b5a54] leading-relaxed">
            Donde casi nadie mira ni interactúa. Significa que ese contenido pasa
            <strong> desapercibido o aburre</strong>.
          </p>
          <ul className="text-xs text-[#7a6a63] mt-3 space-y-1.5 list-disc pl-4">
            <li>Si tu botón "Comprar" está frío → muévelo más arriba o hazlo más visible.</li>
            <li>Secciones frías largas → acórtalas; el cliente las salta.</li>
            <li>Si el frío empieza a media página → ahí abandonan; pon lo importante antes.</li>
          </ul>
        </div>
      </div>

      {/* Para qué sirve */}
      <div className="rounded-2xl border border-[#ece2dc] bg-white p-5">
        <p className="font-bold text-[#2D1A14] mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#A67163]" /> ¿Para qué te sirve un mapa de calor?
        </p>
        <div className="grid sm:grid-cols-3 gap-3 text-xs text-[#6b5a54]">
          <div className="flex gap-2">
            <MousePointerClick className="w-4 h-4 text-[#A67163] flex-shrink-0" />
            <span>Descubres qué botones e imágenes generan clics y cuáles se ignoran.</span>
          </div>
          <div className="flex gap-2">
            <Eye className="w-4 h-4 text-[#A67163] flex-shrink-0" />
            <span>Ves hasta dónde baja la gente (scroll) y dónde abandona la página.</span>
          </div>
          <div className="flex gap-2">
            <Flame className="w-4 h-4 text-[#A67163] flex-shrink-0" />
            <span>Optimizas la tienda con datos reales para vender más, no por intuición.</span>
          </div>
        </div>
      </div>

      {/* Mapa de calor de navegación (datos propios) */}
      <div className="rounded-2xl border border-[#ece2dc] bg-white p-5">
        <div className="flex items-center justify-between mb-1">
          <p className="font-bold text-[#2D1A14]">Mapa de calor de navegación</p>
          <span className="text-xs text-[#9e8a84]">{ranking.total} visitas registradas</span>
        </div>
        <p className="text-xs text-[#9e8a84] mb-4">
          Calculado con tus propios datos: las páginas más visitadas se pintan
          calientes (rojo) y las menos visitadas, frías (azul).
        </p>

        {ranking.arr.length === 0 ? (
          <p className="text-sm text-[#9e8a84] py-6 text-center">
            Aún no hay visitas registradas para construir el mapa.
          </p>
        ) : (
          <div className="space-y-2.5">
            {ranking.arr.map(({ path, views }) => {
              const pct = ranking.max ? Math.round((views / ranking.max) * 100) : 0
              return (
                <div key={path} className="flex items-center gap-3">
                  <span className="w-40 text-xs text-[#2D1A14] truncate flex-shrink-0">
                    {labelFor(path)}
                  </span>
                  <div className="flex-1 h-5 rounded-full bg-[#f3ece9] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.max(pct, 6)}%`, backgroundColor: heatColor(views) }}
                    />
                  </div>
                  <span className="w-12 text-right text-xs font-semibold text-[#6b5a54] flex-shrink-0">
                    {views}
                  </span>
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
