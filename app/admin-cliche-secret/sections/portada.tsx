"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircle, ExternalLink, ImagePlus, RefreshCw, RotateCcw, Save, Smartphone, Upload } from "lucide-react"
import { adminFetch } from "@/lib/admin-client"
import { subirImagen } from "@/lib/admin-upload"
import { IMAGE_ACCEPT } from "@/lib/upload-limits"
import { DEFAULT_SLIDES, applyHeroOverrides, type HeroOverride } from "@/lib/editorial-hero"

/**
 * Sección "Portada" — réplica 1:1 del hero editorial del home (misma
 * arquitectura que el editor de la página de ventas): la diapositiva se ve
 * TAL CUAL en la tienda y cada pieza se edita en su sitio — clic en la foto
 * para reemplazarla, clic en el eyebrow, el título, el párrafo, el botón o el
 * microcopy para escribir. Guardar publica al instante (el API revalida "/").
 *
 * Lo que se guarda son OVERRIDES: un campo vacío vuelve al texto de fábrica,
 * y la estructura (layout split de móvil, encuadres) se conserva.
 */

const EMPTY: HeroOverride = {}

export function PortadaSection() {
  const [overrides, setOverrides] = useState<HeroOverride[]>(DEFAULT_SLIDES.map(() => EMPTY))
  const [idx, setIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  // "desktop" reemplaza la foto de PC; "mobile" la vertical del celular.
  const photoTarget = useRef<"desktop" | "mobile">("desktop")
  const savedRef = useRef("")

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await adminFetch("/api/admin/hero")
        const data = await res.json().catch(() => ({}))
        if (!alive) return
        const list: HeroOverride[] = Array.isArray(data.overrides) ? data.overrides : []
        const full = DEFAULT_SLIDES.map((_, i) => list[i] || EMPTY)
        setOverrides(full)
        savedRef.current = JSON.stringify(full)
        if (!res.ok) setError(data?.error || "No se pudo cargar la portada.")
      } catch {
        if (alive) setError("No se pudo cargar la portada; se muestran los textos de fábrica.")
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  function setField(key: keyof HeroOverride, value: string) {
    setOverrides(list => list.map((o, i) => i === idx ? { ...o, [key]: value } : o))
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setError("")
    const r = await subirImagen(file)
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ""
    if ("url" in r) setField(photoTarget.current === "mobile" ? "mobileSrc" : "src", r.url)
    else setError(r.error)
  }

  /** Devuelve esta diapositiva a sus textos y fotos de fábrica. */
  function resetSlide() {
    if (!confirm("¿Devolver esta diapositiva a su contenido original?")) return
    setOverrides(list => list.map((o, i) => i === idx ? EMPTY : o))
  }

  async function save() {
    setSaving(true); setError("")
    try {
      const res = await adminFetch("/api/admin/hero", { method: "POST", body: JSON.stringify(overrides) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data?.error || "No se pudo guardar."); return }
      savedRef.current = JSON.stringify(data.overrides || overrides)
      setSavedAt(new Date())
    } catch {
      setError("Error de conexión.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="py-20 flex justify-center"><RefreshCw className="w-6 h-6 animate-spin text-[#A67163]" /></div>
  }

  // Lo que se pinta es EXACTAMENTE lo que verá la tienda: las de fábrica con
  // los overrides aplicados (misma función que usa el componente público).
  const slides = applyHeroOverrides(overrides)
  const slide = slides[idx]
  const o = overrides[idx] || EMPTY
  const hayCambios = JSON.stringify(overrides) !== savedRef.current
  const ringLight = "rounded-xl outline-none ring-1 ring-dashed ring-white/45 hover:ring-white/80 focus:ring-2 focus:ring-white transition-shadow px-2 py-1 -mx-2 bg-transparent"

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h2 className="font-serif text-2xl font-bold text-[#2D1A14]">Portada</h2>
          <p className="text-sm text-[#2D1A14]/50 mt-0.5">El hero del home, tal cual se ve. Haz clic en la foto o en cualquier texto para editarlo.</p>
        </div>
        <div className="flex-1" />
        <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-medium text-[#A67163] hover:underline">
          <ExternalLink className="w-3.5 h-3.5" /> Ver portada real
        </a>
        <button onClick={save} disabled={saving || !hayCambios} className="btnp btnp-dark">
          {saving ? <RefreshCw className="animate-spin" /> : <Save />} Guardar cambios
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
        </p>
      )}
      {savedAt && !error && !hayCambios && (
        <p className="text-[11px] text-green-700/80">
          Guardado a las {savedAt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })} — la portada ya está publicada.
        </p>
      )}

      <input ref={fileRef} type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={handlePhoto} />

      {/* ── Réplica 1:1 del hero ── */}
      <div className="rounded-2xl border border-[#2D1A14]/10 shadow-sm overflow-hidden relative bg-[#2D1A14]" style={{ minHeight: 560 }}>
        {slide.media.type === "image" || o.src ? (
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${slide.media.src})`, backgroundColor: slide.media.bg }} />
        ) : (
          <video src={slide.media.src} poster={slide.media.poster} muted loop playsInline autoPlay className="absolute inset-0 h-full w-full object-cover" />
        )}
        {/* Los mismos degradados del hero real (variante alineada a la izquierda) */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/15" />

        {/* Reemplazar fotos (PC y celular) */}
        <div className="absolute top-4 right-4 z-10 flex flex-wrap justify-end gap-2">
          <button
            onClick={() => { photoTarget.current = "desktop"; fileRef.current?.click() }}
            disabled={uploading}
            className="btnp btnp-sm bg-white/95 text-[#2D1A14] shadow hover:bg-white"
          >
            {uploading ? <RefreshCw className="animate-spin" /> : <Upload />} Foto de computador
          </button>
          {slide.media.mobileSrc && (
            <button
              onClick={() => { photoTarget.current = "mobile"; fileRef.current?.click() }}
              disabled={uploading}
              className="btnp btnp-sm bg-white/95 text-[#2D1A14] shadow hover:bg-white"
            >
              <Smartphone /> Foto de celular
            </button>
          )}
        </div>

        {/* Contenido del hero — editable en su sitio */}
        <div className="relative z-[1] flex flex-col justify-center h-full px-6 sm:px-14" style={{ minHeight: 560 }}>
          <div className="w-full max-w-xl py-16">
            <input
              value={o.eyebrow ?? slide.eyebrow ?? ""}
              onChange={e => setField("eyebrow", e.target.value)}
              placeholder="Texto pequeño sobre el título"
              className={`block w-full mb-3 text-[0.65rem] font-semibold uppercase tracking-[0.38em] text-white/75 placeholder:text-white/40 ${ringLight}`}
            />
            <textarea
              value={o.title ?? slide.title}
              onChange={e => setField("title", e.target.value)}
              rows={2}
              placeholder="Título grande de la portada"
              className={`block w-full resize-none font-serif font-medium leading-[1.04] text-white placeholder:text-white/40 ${ringLight}`}
              style={{ fontSize: "clamp(2rem, 5vw, 3.4rem)" }}
              title="Salta de línea con Enter — el hero respeta los saltos"
              onInput={e => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = `${t.scrollHeight}px` }}
            />
            <div className="my-4 h-[1px] w-[56px] bg-white/25" />
            <textarea
              value={o.subtitle ?? slide.subtitle ?? ""}
              onChange={e => setField("subtitle", e.target.value)}
              rows={3}
              placeholder="El párrafo que acompaña al título…"
              className={`block w-full max-w-md resize-y text-[0.95rem] font-light leading-relaxed text-white/85 placeholder:text-white/40 ${ringLight}`}
            />
            {/* Botón: la etiqueta y el destino se editan en su sitio */}
            <div className="mt-7 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-3 rounded-full bg-[#FAF8F5] py-2 pl-5 pr-2 text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-[#2D1A14] shadow-[0_12px_34px_rgba(0,0,0,0.28)]">
                <input
                  value={o.ctaLabel ?? slide.cta?.label ?? ""}
                  onChange={e => setField("ctaLabel", e.target.value)}
                  placeholder="TEXTO DEL BOTÓN"
                  size={Math.max((o.ctaLabel ?? slide.cta?.label ?? "").length, 14)}
                  className="bg-transparent outline-none text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-[#2D1A14] placeholder:text-[#2D1A14]/40"
                />
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2D1A14] text-[#FAF8F5]"><span className="text-sm leading-none">→</span></span>
              </span>
              <input
                value={o.ctaHref ?? slide.cta?.href ?? ""}
                onChange={e => setField("ctaHref", e.target.value)}
                placeholder="/productos/aroma-…"
                className={`text-[11px] text-white/70 placeholder:text-white/35 w-[230px] ${ringLight}`}
                title="A dónde lleva el botón (ruta del sitio)"
              />
            </div>
            <input
              value={o.microcopy ?? slide.microcopy ?? ""}
              onChange={e => setField("microcopy", e.target.value)}
              placeholder="Línea de confianza bajo el botón (solo en computador)"
              className={`block w-full mt-5 text-[0.6rem] font-medium uppercase tracking-[0.22em] text-white/45 placeholder:text-white/30 ${ringLight}`}
            />
          </div>
        </div>

        {/* Dots — aquí navegan entre diapositivas */}
        <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 gap-3">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} aria-label={`Diapositiva ${i + 1}`} className="py-2.5 -my-2.5">
              <span className={`block h-[2px] rounded-full transition-all duration-500 ${i === idx ? "w-10 bg-white" : "w-3 bg-white/35 hover:bg-white/65"}`} />
            </button>
          ))}
        </div>
      </div>

      {/* Vista de celular + acciones de la diapositiva */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-xs font-semibold text-[#2D1A14]/45 uppercase tracking-wide mr-1">Diapositiva {idx + 1} de {slides.length}</span>
        <button onClick={resetSlide} className="btnp btnp-ghost btnp-sm"><RotateCcw /> Volver al original</button>
        {slide.media.mobileSrc && (
          <span className="inline-flex items-center gap-2 text-[11px] text-[#2D1A14]/45">
            <ImagePlus className="w-3.5 h-3.5" /> En celular se usa la foto vertical (la cambias con «Foto de celular»).
          </span>
        )}
        <p className="w-full sm:w-auto text-[11px] text-[#2D1A14]/40 sm:ml-auto">Un campo vacío vuelve al texto original de esa diapositiva.</p>
      </div>
    </div>
  )
}
