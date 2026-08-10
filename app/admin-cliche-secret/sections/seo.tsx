"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Search, RefreshCw, Save, Wand2, Check, AlertCircle, Globe, Package } from "lucide-react"
import type { Product } from "@/lib/supabase"
import { adminFetch } from "@/lib/admin-client"
import { Ayuda } from "../components/ayuda"
import {
  SEO_PAGES,
  SEO_MAX_TITLE,
  SEO_MAX_DESCRIPTION,
  productSeoPath,
  suggestPageSeo,
  suggestProductTitle,
  suggestProductDescription,
  seoLengthTone,
  trimTo,
  SEO_TITLE_SUFFIX,
  type SeoRow,
} from "@/lib/seo"

const DOMAIN = "www.clichecolombia.com"

interface Entry {
  path: string
  label: string
  kind: "page" | "product"
  defaultTitle: string
  defaultDescription: string
  /** Portada: su título NO recibe el sufijo de plantilla. */
  absoluteTitle?: boolean
}

type Draft = { title: string; description: string }

// ── Piezas de UI ─────────────────────────────────────────────────────────────

const TONE_CLASS: Record<string, string> = {
  empty: "text-[#2D1A14]/35",
  short: "text-amber-600",
  ok: "text-emerald-600",
  long: "text-red-600",
}

function Counter({ value, max }: { value: string; max: number }) {
  const tone = seoLengthTone(value.length, max)
  return (
    <span className={`text-[11px] font-medium tabular-nums ${TONE_CLASS[tone]}`}>
      {value.length} / {max}
    </span>
  )
}

/** Vista previa del resultado en Google (título azul, URL verde, texto gris). */
function GooglePreview({ url, title, description }: { url: string; title: string; description: string }) {
  const crumbs = url === "/" ? DOMAIN : `${DOMAIN} › ${url.replace(/^\//, "").split("/").join(" › ")}`
  return (
    <div className="rounded-xl border border-[#2D1A14]/10 bg-white p-4">
      {/* div y no <p>: el globo de ayuda lleva párrafos dentro y el navegador
          rompería un <p> anidado (mismatch de hidratación). */}
      <div className="text-[10px] font-bold uppercase tracking-widest text-[#2D1A14]/30 mb-2 flex items-center gap-1.5">
        Así se vería en Google
        <Ayuda tema="vistaPreviaGoogle" align="left" />
      </div>
      <p className="text-[13px] text-[#3C4043] leading-tight truncate">{crumbs}</p>
      <p className="text-[#1a0dab] text-[18px] leading-snug hover:underline cursor-default truncate">
        {trimTo(title, SEO_MAX_TITLE) || "Sin título"}
      </p>
      <p className="text-[13px] text-[#4d5156] leading-snug mt-0.5">
        {trimTo(description, SEO_MAX_DESCRIPTION) || "Sin descripción: Google inventará un resumen con el texto de la página."}
      </p>
    </div>
  )
}

// ── Editor de una entrada ────────────────────────────────────────────────────

function SeoEditor({
  entry,
  saved,
  onSaved,
  onDirty,
}: {
  entry: Entry
  saved: Draft | undefined
  onSaved: (path: string, draft: Draft) => void
  /** Avisa al padre si hay cambios sin guardar (para no cerrarlos en silencio). */
  onDirty?: (dirty: boolean) => void
}) {
  const initial: Draft = { title: saved?.title || "", description: saved?.description || "" }
  const [draft, setDraft] = useState<Draft>(initial)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle")
  const [error, setError] = useState("")

  // Si llega otra carga del servidor, refrescar lo que no se está editando.
  useEffect(() => {
    setDraft({ title: saved?.title || "", description: saved?.description || "" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved?.title, saved?.description])

  const dirty = draft.title !== initial.title || draft.description !== initial.description

  // El padre necesita saberlo ANTES de colapsar la tarjeta o cambiar de
  // pestaña: si no, un clic descartaba lo escrito sin preguntar.
  useEffect(() => {
    onDirty?.(dirty)
    return () => { onDirty?.(false) }
  }, [dirty, onDirty])

  // Lo que realmente sale al mundo: lo escrito, o el texto por defecto.
  const effectiveTitle = (draft.title || entry.defaultTitle) + (entry.absoluteTitle ? "" : SEO_TITLE_SUFFIX)
  const effectiveDescription = draft.description || entry.defaultDescription

  function autogenerate() {
    setStatus("idle")
    if (entry.kind === "page") {
      const s = suggestPageSeo(entry.path)
      setDraft({ title: s.title || entry.defaultTitle, description: s.description || entry.defaultDescription })
    } else {
      setDraft({
        title: suggestProductTitle(entry.label),
        description: suggestProductDescription(entry.label, entry.defaultDescription),
      })
    }
  }

  async function save() {
    setSaving(true)
    setError("")
    setStatus("idle")
    try {
      const res = await adminFetch("/api/admin/seo", {
        method: "POST",
        body: JSON.stringify({ path: entry.path, title: draft.title, description: draft.description }),
      })
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: "" }))
        setError(msg || "No se pudo guardar")
        setStatus("error")
        return
      }
      onSaved(entry.path, draft)
      setStatus("ok")
    } catch {
      setError("Error de conexión")
      setStatus("error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 border-t border-[#2D1A14]/8 pt-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-[#2D1A14]/70">Meta título</label>
            <Ayuda tema="metaTitulo" align="left" />
          </span>
          {/* El contador mide el título REAL (con el sufijo de marca que se
              añade solo), no lo tecleado: si no, marcaría verde un título que
              Google ya está cortando. */}
          <span className="flex items-center gap-1.5">
            <Counter value={effectiveTitle} max={SEO_MAX_TITLE} />
            <Ayuda tema="contadorCaracteres" />
          </span>
        </div>
        <input
          value={draft.title}
          onChange={(e) => { setDraft((d) => ({ ...d, title: e.target.value })); setStatus("idle") }}
          placeholder={entry.defaultTitle}
          className="w-full px-3 py-2.5 rounded-xl border border-[#2D1A14]/15 bg-[#FAF8F5] text-sm text-[#2D1A14] focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
        />
        {!entry.absoluteTitle && (
          <p className="text-[11px] text-[#2D1A14]/40 mt-1.5">
            Al final se añade solo «{SEO_TITLE_SUFFIX.trim()}» ({SEO_TITLE_SUFFIX.length} caracteres), y eso ya está contado arriba.
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-[#2D1A14]/70">Meta descripción</label>
            <Ayuda tema="metaDescripcion" align="left" />
          </span>
          <span className="flex items-center gap-1.5">
            <Counter value={effectiveDescription} max={SEO_MAX_DESCRIPTION} />
            <Ayuda tema="contadorCaracteres" />
          </span>
        </div>
        <textarea
          value={draft.description}
          onChange={(e) => { setDraft((d) => ({ ...d, description: e.target.value })); setStatus("idle") }}
          placeholder={entry.defaultDescription}
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl border border-[#2D1A14]/15 bg-[#FAF8F5] text-sm text-[#2D1A14] resize-y focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
        />
      </div>

      <GooglePreview url={entry.path} title={effectiveTitle} description={effectiveDescription} />

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={autogenerate}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[#2D1A14]/15 text-sm font-medium text-[#2D1A14]/70 hover:bg-[#2D1A14]/5 transition-colors"
        >
          <Wand2 className="w-4 h-4" /> Generar sugerencia
        </button>
        <Ayuda tema="generarSugerencia" align="left" />
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2D1A14] hover:bg-[#3D2A24] text-white text-sm font-semibold transition-colors disabled:opacity-40"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
        </button>
        {status === "ok" && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
            <Check className="w-3.5 h-3.5" /> Guardado
          </span>
        )}
        {status === "error" && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
            <AlertCircle className="w-3.5 h-3.5" /> {error}
          </span>
        )}
        <span className="text-[11px] text-[#2D1A14]/40 ml-auto">
          Deja ambos campos vacíos y guarda para volver al texto por defecto.
        </span>
      </div>
    </div>
  )
}

// ── Sección ──────────────────────────────────────────────────────────────────

export function SeoSection({ products }: { products: Product[] }) {
  const [tab, setTab] = useState<"paginas" | "productos">("paginas")
  const [rows, setRows] = useState<Record<string, Draft>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [query, setQuery] = useState("")
  const [openPath, setOpenPath] = useState<string | null>(SEO_PAGES[0].path)
  // ¿El editor abierto tiene cambios sin guardar? (solo hay uno abierto a la vez)
  const [openDirty, setOpenDirty] = useState(false)
  // Sube con cada "Recargar" para remontar el editor abierto: si el servidor
  // devuelve exactamente lo mismo que ya había, el efecto de reset del editor
  // no se dispara y el borrador descartado seguiría en pantalla con la
  // protección de cambios sin guardar apagada.
  const [reloadKey, setReloadKey] = useState(0)

  /** Cambia el editor abierto; si el actual tiene cambios sin guardar, pregunta
   *  primero. Devuelve false si la dueña decidió quedarse. */
  function changeOpen(next: string | null): boolean {
    if (openDirty && !confirm("Tienes cambios sin guardar en el editor abierto. ¿Salir sin guardarlos?")) return false
    setOpenDirty(false)
    setOpenPath(next)
    return true
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminFetch("/api/admin/seo")
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "" }))
        setLoadError(error || "No se pudo cargar el SEO guardado")
        return
      }
      const { rows: data } = (await res.json()) as { rows: SeoRow[] }
      const map: Record<string, Draft> = {}
      ;(data || []).forEach((r) => { map[r.path] = { title: r.title || "", description: r.description || "" } })
      setRows(map)
      setLoadError("")
    } catch {
      setLoadError("Error de conexión al cargar el SEO")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function handleSaved(path: string, draft: Draft) {
    setRows((prev) => {
      const next = { ...prev }
      if (!draft.title && !draft.description) delete next[path]
      else next[path] = draft
      return next
    })
  }

  const pageEntries: Entry[] = useMemo(
    () =>
      SEO_PAGES.map((p) => ({
        path: p.path,
        label: p.label,
        kind: "page" as const,
        defaultTitle: p.title,
        defaultDescription: p.description,
        absoluteTitle: p.path === "/",
      })),
    [],
  )

  const productEntries: Entry[] = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products
      // El producto que se está editando con cambios sin guardar no se filtra
      // nunca: si el buscador lo sacara de la lista, el editor desaparecería
      // y se perdería lo escrito sin preguntar.
      .filter((p) =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (openDirty && productSeoPath(p.slug) === openPath),
      )
      .map((p) => ({
        path: productSeoPath(p.slug),
        label: p.name,
        kind: "product" as const,
        defaultTitle: p.name,
        defaultDescription: p.description || `${p.name} — Cliché Colombia`,
      }))
  }, [products, query, openDirty, openPath])

  const entries = tab === "paginas" ? pageEntries : productEntries
  const personalizados = Object.keys(rows).length

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-2xl font-bold text-[#2D1A14] flex items-center gap-2">
          SEO
          <Ayuda tema="seo" align="left" />
        </h2>
        <p className="text-sm text-[#2D1A14]/50 mt-1">
          Meta título y meta descripción de cada página y producto: es el texto con el que apareces en Google.
          Si dejas un campo vacío se usa el texto por defecto. {personalizados > 0 && `Hoy tienes ${personalizados} personalizado${personalizados === 1 ? "" : "s"}.`}
        </p>
      </div>

      {loadError && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* Pulsar la pestaña que ya está activa no hace nada: antes colapsaba
            el editor abierto (y hasta preguntaba por cambios sin guardar). */}
        <button
          onClick={() => { if (tab !== "paginas" && changeOpen(SEO_PAGES[0].path)) setTab("paginas") }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            tab === "paginas" ? "bg-[#2D1A14] text-white" : "text-[#2D1A14]/60 hover:bg-[#2D1A14]/5"
          }`}
        >
          <Globe className="w-4 h-4" /> Páginas
        </button>
        <button
          onClick={() => { if (tab !== "productos" && changeOpen(null)) setTab("productos") }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            tab === "productos" ? "bg-[#2D1A14] text-white" : "text-[#2D1A14]/60 hover:bg-[#2D1A14]/5"
          }`}
        >
          <Package className="w-4 h-4" /> Productos ({products.length})
        </button>
        {/* Recargar pisa el borrador con lo guardado en el servidor: si hay
            cambios sin guardar, se pregunta antes (igual que al cambiar de
            pestaña o cerrar la tarjeta). */}
        <button
          onClick={() => {
            if (openDirty && !confirm("Tienes cambios sin guardar en el editor abierto. ¿Recargar y perderlos?")) return
            setOpenDirty(false)
            setReloadKey((k) => k + 1)
            load()
          }}
          className="ml-auto inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[#2D1A14]/15 text-sm text-[#2D1A14]/60 hover:bg-[#2D1A14]/5 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Recargar
        </button>
      </div>

      {tab === "productos" && (
        <div className="relative">
          <Search className="w-4 h-4 text-[#2D1A14]/30 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar producto…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#2D1A14]/15 bg-white text-sm text-[#2D1A14] focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
          />
        </div>
      )}

      <div className="space-y-3">
        {entries.length === 0 && (
          <p className="text-sm text-[#2D1A14]/40 py-8 text-center">No hay resultados.</p>
        )}
        {entries.map((entry) => {
          const open = openPath === entry.path
          const custom = !!rows[entry.path]
          return (
            <div key={entry.path} className="bg-white rounded-2xl border border-[#2D1A14]/10 p-4 sm:p-5">
              <button
                onClick={() => changeOpen(open ? null : entry.path)}
                className="w-full flex items-center gap-3 text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#2D1A14] text-sm truncate">{entry.label}</p>
                  <p className="text-xs text-[#2D1A14]/40 truncate">{entry.path}</p>
                </div>
                {custom ? (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                    Personalizado
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-[#2D1A14]/5 text-[#2D1A14]/40">
                    Por defecto
                  </span>
                )}
                <span className="text-xs text-[#2D1A14]/40">{open ? "Cerrar" : "Editar"}</span>
              </button>
              {open && (
                <div className="mt-4">
                  <SeoEditor key={reloadKey} entry={entry} saved={rows[entry.path]} onSaved={handleSaved} onDirty={setOpenDirty} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
