"use client"
import { useState, useRef, useEffect, useCallback } from "react"
import {
  Save, RefreshCw, Check, Monitor, Smartphone, Image as ImageIcon,
  Upload, Trash2, ArrowUp, ArrowDown, Type, Eye, Megaphone, MessageCircle,
  Tag, Zap, ChevronDown, MousePointerClick,
} from "lucide-react"
import { adminFetch, getAdminPw } from "@/lib/admin-client"

interface PersonalizarSectionProps {
  settings: Record<string, string>
  onSettingsUpdate: (settings: Record<string, string>) => void
}

// Imágenes por defecto del hero (coinciden con components/hero.tsx)
const DEFAULT_HERO = ["/images/hero-main.jpg", "/images/lifestyle-bedroom.jpg", "/images/lifestyle-living.jpg"]

interface Field { key: string; label: string; placeholder: string; type?: string; area?: boolean }
interface Toggle { key: string; label: string; hint: string }
interface Group {
  id: string
  title: string
  icon: typeof Type
  desc: string
  fields?: Field[]
  images?: boolean
  toggles?: Toggle[]
}

// Bloques agrupados por área de la tienda — un acordeón a la vez = menos ruido.
const GROUPS: Group[] = [
  {
    id: "hero",
    title: "Portada (Hero)",
    icon: ImageIcon,
    desc: "Título, subtítulo e imágenes del carrusel",
    fields: [
      { key: "hero_title", label: "Título principal", placeholder: "Tu hogar oliendo a spa en 3 segundos", area: true },
      { key: "hero_subtitle", label: "Subtítulo", placeholder: "Sin velas. Sin enchufes...", area: true },
    ],
    images: true,
  },
  {
    id: "announcement",
    title: "Barra de anuncio",
    icon: Megaphone,
    desc: "La franja superior de la tienda",
    fields: [
      { key: "announcement_text", label: "Texto del anuncio", placeholder: "Envío gratis a partir de $300.000" },
      { key: "free_shipping_threshold", label: "Mínimo envío gratis (COP)", placeholder: "300000", type: "number" },
    ],
  },
  {
    id: "featured",
    title: "Productos Destacados",
    icon: Type,
    desc: "Título y subtítulo de la sección de productos",
    fields: [
      { key: "featured_title", label: "Título", placeholder: "Productos Destacados" },
      { key: "featured_subtitle", label: "Subtítulo", placeholder: "Los favoritos de nuestra comunidad", area: true },
    ],
  },
  {
    id: "secciones",
    title: "Secciones de la página",
    icon: Type,
    desc: "Textos que aparecen más abajo del inicio",
    fields: [
      { key: "cta_title", label: "Empresas · Título", placeholder: "¿Tienes una marca? Creamos tu identidad olfativa", area: true },
      { key: "cta_subtitle", label: "Empresas · Subtítulo", placeholder: "Diseñamos aromas exclusivos...", area: true },
      { key: "newsletter_subtitle", label: "Newsletter · Subtítulo", placeholder: "Suscríbete y recibe tu código...", area: true },
    ],
  },
  {
    id: "discount",
    title: "Descuento",
    icon: Tag,
    desc: "Código y porcentaje de la oferta",
    fields: [
      { key: "discount_code", label: "Código de descuento", placeholder: "BIENVENIDA10" },
      { key: "discount_percentage", label: "Porcentaje (%)", placeholder: "10", type: "number" },
    ],
  },
  {
    id: "whatsapp",
    title: "WhatsApp",
    icon: MessageCircle,
    desc: "Botón flotante de contacto",
    fields: [
      { key: "whatsapp_number", label: "Número (con código país)", placeholder: "573194565463" },
      { key: "whatsapp_message", label: "Mensaje predeterminado", placeholder: "Hola, me interesa...", area: true },
    ],
  },
  {
    id: "effects",
    title: "Efectos de conversión",
    icon: Zap,
    desc: "Activa o desactiva elementos de urgencia",
    toggles: [
      { key: "urgency_bar_enabled", label: "Barra de urgencia", hint: "Franja con contador y oferta" },
      { key: "countdown_enabled", label: "Contador de tiempo", hint: "Cuenta regresiva de la oferta" },
      { key: "stock_badge_enabled", label: "Badges de stock bajo", hint: "\"¡Últimas unidades!\"" },
      { key: "social_proof_enabled", label: "Notificaciones sociales", hint: "Avisos de compras recientes" },
    ],
  },
]

// Mapa clave → grupo (para abrir el acordeón correcto al clickear un bloque).
const KEY_TO_GROUP: Record<string, string> = (() => {
  const m: Record<string, string> = {}
  GROUPS.forEach(g => {
    g.fields?.forEach(f => { m[f.key] = g.id })
    g.toggles?.forEach(t => { m[t.key] = g.id })
    if (g.images) m["__images"] = g.id
  })
  m["hero_slides"] = "hero"
  return m
})()

export function PersonalizarSection({ settings, onSettingsUpdate }: PersonalizarSectionProps) {
  const [local, setLocal] = useState<Record<string, string>>({ ...settings })
  const [slides, setSlides] = useState<string[]>(() => {
    try {
      const parsed = JSON.parse(settings.hero_slides || "[]")
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    } catch { /* default */ }
    return [...DEFAULT_HERO]
  })
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop")
  const [openGroup, setOpenGroup] = useState<string>("hero")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState<number | null>(null)
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const fieldRefs = useRef<Record<string, HTMLDivElement | null>>({})
  // Mientras se edita un texto EN SITIO no re-empujamos el preview (pisaría el
  // cursor del usuario). El iframe ya muestra lo que escribe en tiempo real.
  const inlineActiveRef = useRef(false)

  // Payload tipado que entiende useSiteSettings en la tienda.
  const buildPreview = useCallback(() => ({
    hero_title: local.hero_title || "",
    hero_subtitle: local.hero_subtitle || "",
    featured_title: local.featured_title || "",
    featured_subtitle: local.featured_subtitle || "",
    cta_title: local.cta_title || "",
    cta_subtitle: local.cta_subtitle || "",
    newsletter_subtitle: local.newsletter_subtitle || "",
    announcement_text: local.announcement_text || "",
    free_shipping_threshold: Number(local.free_shipping_threshold || 300000),
    discount_code: local.discount_code || "BIENVENIDA10",
    discount_percentage: Number(local.discount_percentage || 10),
    whatsapp_number: local.whatsapp_number || "",
    whatsapp_message: local.whatsapp_message || "",
    hero_slides: slides,
    urgency_bar_enabled: local.urgency_bar_enabled !== "false",
    countdown_enabled: local.countdown_enabled !== "false",
    stock_badge_enabled: local.stock_badge_enabled !== "false",
    social_proof_enabled: local.social_proof_enabled !== "false",
  }), [local, slides])

  const pushPreview = useCallback(() => {
    if (inlineActiveRef.current) return // no pisar el cursor mientras se escribe en sitio
    iframeRef.current?.contentWindow?.postMessage(
      { type: "cliche-preview-settings", settings: buildPreview() }, "*"
    )
  }, [buildPreview])

  useEffect(() => { pushPreview() }, [pushPreview])

  // Mensajes desde el preview (overlay tipo Canva dentro del iframe).
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const d = e.data || {}
      switch (d.type) {
        case "cliche-edit-click":
          if (d.key) focusField(d.key)
          break
        case "cliche-inline-start":
          inlineActiveRef.current = true
          break
        case "cliche-inline-edit": // el usuario escribe sobre el bloque
          if (d.key) { setField(d.key, d.value ?? ""); setDirty(true) }
          break
        case "cliche-inline-end": // soltó el bloque → sincronizamos el preview
          inlineActiveRef.current = false
          if (d.key) { setField(d.key, d.value ?? ""); setDirty(true) }
          break
      }
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function focusField(key: string) {
    const target = key === "hero_slides" ? "__images" : key
    const groupId = KEY_TO_GROUP[target] || KEY_TO_GROUP[key]
    if (groupId) setOpenGroup(groupId)
    setHighlightedKey(target)
    // Esperamos a que el grupo se expanda antes de hacer scroll/foco.
    setTimeout(() => {
      const el = fieldRefs.current[target]
      el?.scrollIntoView({ behavior: "smooth", block: "center" })
      const input = el?.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea")
      input?.focus()
    }, 120)
    setTimeout(() => setHighlightedKey(prev => (prev === target ? null : prev)), 2600)
  }

  // Al enfocar un campo, resaltamos su bloque en el preview (bidireccional).
  function highlightInPreview(key: string) {
    iframeRef.current?.contentWindow?.postMessage({ type: "cliche-edit-highlight", key }, "*")
  }

  function setField(key: string, value: string) {
    setLocal(prev => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  async function uploadImage(file: File, index: number) {
    setUploading(index)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "x-admin-password": getAdminPw() },
        body: fd,
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "" }))
        alert(error || "No se pudo subir la imagen")
        return
      }
      const { url } = await res.json()
      setSlides(prev => {
        const next = [...prev]
        if (index < next.length) next[index] = url
        else next.push(url)
        return next
      })
      setDirty(true)
    } finally {
      setUploading(null)
    }
  }

  function moveSlide(i: number, dir: -1 | 1) {
    setSlides(prev => {
      const next = [...prev]
      const j = i + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
    setDirty(true)
  }

  function removeSlide(i: number) {
    setSlides(prev => prev.filter((_, idx) => idx !== i))
    setDirty(true)
  }

  async function save() {
    setSaving(true)
    try {
      const payload: Record<string, string> = { ...local, hero_slides: JSON.stringify(slides) }
      const res = await adminFetch("/api/admin/settings", {
        method: "POST",
        body: JSON.stringify({ settings: payload }),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "" }))
        alert(error || "No se pudo guardar")
        return
      }
      onSettingsUpdate(payload)
      setSaved(true)
      setDirty(false)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    "w-full px-3 py-2 rounded-lg border border-[#2D1A14]/12 bg-white text-[#2D1A14] text-sm focus:outline-none focus:ring-2 focus:ring-[#A67163]/40 focus:border-[#A67163]/40 transition"

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#2D1A14]">Editor Visual</h2>
          <p className="text-sm text-[#2D1A14]/50 mt-0.5 flex items-center gap-1.5">
            <MousePointerClick className="w-3.5 h-3.5" />
            Haz clic en cualquier bloque de la vista previa para editarlo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-[#2D1A14]/12 rounded-xl p-1">
            <button onClick={() => setDevice("desktop")} title="Escritorio"
              className={`p-1.5 rounded-lg transition-colors ${device === "desktop" ? "bg-[#2D1A14] text-white" : "text-[#2D1A14]/50 hover:text-[#2D1A14]"}`}>
              <Monitor className="w-4 h-4" />
            </button>
            <button onClick={() => setDevice("mobile")} title="Móvil"
              className={`p-1.5 rounded-lg transition-colors ${device === "mobile" ? "bg-[#2D1A14] text-white" : "text-[#2D1A14]/50 hover:text-[#2D1A14]"}`}>
              <Smartphone className="w-4 h-4" />
            </button>
          </div>
          <button onClick={() => { if (iframeRef.current) iframeRef.current.src = "/?preview=1" }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white text-[#2D1A14]/60 border border-[#2D1A14]/12 hover:border-[#2D1A14]/30 transition-all"
            title="Recargar vista previa">
            <RefreshCw className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Refrescar</span>
          </button>
          <button onClick={save} disabled={saving || (!dirty && !saved)}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 ${dirty ? "bg-[#A67163] hover:bg-[#8B5A4A]" : "bg-[#2D1A14] hover:bg-[#3D2A24]"}`}>
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? "Guardando…" : saved ? "Guardado" : dirty ? "Publicar cambios" : "Publicar"}
            {dirty && !saving && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-white" />
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-5 items-start">
        {/* ── EDITOR (acordeón) ── */}
        <div className="space-y-2.5 order-2 xl:order-1">
          {GROUPS.map(group => {
            const Icon = group.icon
            const open = openGroup === group.id
            return (
              <div key={group.id} className="bg-white rounded-2xl border border-[#2D1A14]/8 overflow-hidden">
                {/* Cabecera del grupo */}
                <button
                  onClick={() => setOpenGroup(open ? "" : group.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[#FAF8F5] transition-colors"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${open ? "bg-[#A67163] text-white" : "bg-[#A67163]/10 text-[#A67163]"}`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#2D1A14]">{group.title}</p>
                    <p className="text-[11px] text-[#2D1A14]/45 truncate">{group.desc}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-[#2D1A14]/40 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
                </button>

                {/* Cuerpo del grupo */}
                {open && (
                  <div className="px-4 pb-4 pt-1 space-y-3.5 border-t border-[#2D1A14]/5">
                    {group.fields?.map(({ key, label, placeholder, type, area }) => (
                      <div
                        key={key}
                        ref={el => { fieldRefs.current[key] = el }}
                        className={`rounded-lg transition-all ${highlightedKey === key ? "ring-2 ring-[#A67163] ring-offset-2 ring-offset-white" : ""}`}
                      >
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-[#2D1A14]/45 mb-1 block">{label}</label>
                        {area ? (
                          <textarea rows={2} value={local[key] || ""} placeholder={placeholder}
                            onChange={e => setField(key, e.target.value)} onFocus={() => highlightInPreview(key)}
                            className={`${inputCls} resize-none`} />
                        ) : (
                          <input type={type || "text"} value={local[key] || ""} placeholder={placeholder}
                            onChange={e => setField(key, e.target.value)} onFocus={() => highlightInPreview(key)}
                            className={inputCls} />
                        )}
                      </div>
                    ))}

                    {/* Imágenes del hero */}
                    {group.images && (
                      <div
                        ref={el => { fieldRefs.current["__images"] = el }}
                        className={`rounded-xl transition-all space-y-2 ${highlightedKey === "__images" ? "ring-2 ring-[#A67163] ring-offset-2 ring-offset-white p-2" : ""}`}
                      >
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-[#2D1A14]/45 flex items-center gap-1.5">
                          <ImageIcon className="w-3 h-3" /> Imágenes del carrusel
                        </label>
                        {slides.map((src, i) => (
                          <div key={i} className="flex items-center gap-2.5 bg-[#FAF8F5] rounded-lg p-1.5 border border-[#2D1A14]/8">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt={`Slide ${i + 1}`} className="w-12 h-9 object-cover rounded-md flex-shrink-0 bg-[#2D1A14]/5" />
                            <p className="flex-1 min-w-0 text-[10px] text-[#2D1A14]/45 truncate">{src.split("/").pop()}</p>
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <button onClick={() => moveSlide(i, -1)} disabled={i === 0} className="p-1.5 rounded-md hover:bg-[#2D1A14]/5 disabled:opacity-25" title="Subir"><ArrowUp className="w-3.5 h-3.5 text-[#2D1A14]/55" /></button>
                              <button onClick={() => moveSlide(i, 1)} disabled={i === slides.length - 1} className="p-1.5 rounded-md hover:bg-[#2D1A14]/5 disabled:opacity-25" title="Bajar"><ArrowDown className="w-3.5 h-3.5 text-[#2D1A14]/55" /></button>
                              <label className="p-1.5 rounded-md hover:bg-[#2D1A14]/5 cursor-pointer" title="Reemplazar">
                                {uploading === i ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#A67163]" /> : <Upload className="w-3.5 h-3.5 text-[#2D1A14]/55" />}
                                <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f, i) }} />
                              </label>
                              <button onClick={() => removeSlide(i)} className="p-1.5 rounded-md hover:bg-red-50" title="Eliminar"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                            </div>
                          </div>
                        ))}
                        <label className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-dashed border-[#2D1A14]/20 text-xs font-semibold text-[#2D1A14]/55 hover:border-[#A67163] hover:text-[#A67163] cursor-pointer transition-colors">
                          {uploading === slides.length ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          Añadir imagen
                          <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f, slides.length) }} />
                        </label>
                      </div>
                    )}

                    {/* Toggles */}
                    {group.toggles?.map(({ key, label, hint }) => (
                      <div key={key} className="flex items-center justify-between gap-3 py-1">
                        <div className="min-w-0">
                          <p className="text-sm text-[#2D1A14] leading-tight">{label}</p>
                          <p className="text-[11px] text-[#2D1A14]/40 truncate">{hint}</p>
                        </div>
                        <button onClick={() => setField(key, local[key] === "false" ? "true" : "false")}
                          className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors ${local[key] !== "false" ? "bg-[#A67163]" : "bg-[#2D1A14]/15"}`}>
                          <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${local[key] !== "false" ? "translate-x-5" : "translate-x-0"}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── LIVE PREVIEW ── */}
        <div className="order-1 xl:order-2 xl:sticky xl:top-4">
          <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-2 px-1">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#2D1A14]/40 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> Vista previa en vivo
              </p>
              <span className="text-[10px] font-medium text-[#2D1A14]/35">{device === "desktop" ? "Escritorio" : "Móvil"}</span>
            </div>
            <div className="bg-[#FAF8F5] rounded-xl overflow-hidden flex justify-center">
              <iframe
                ref={iframeRef}
                src="/?preview=1"
                title="Vista previa de la tienda"
                onLoad={pushPreview}
                className="bg-white border-0 transition-all duration-300"
                style={{ width: device === "mobile" ? 390 : "100%", height: "72vh", minHeight: 560 }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
