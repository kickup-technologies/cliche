"use client"

import { useRef, useState } from "react"
import { ArrowLeft, Save, RefreshCw, AlertCircle, Heart, Share2, Truck, ShieldCheck, BadgeCheck, ExternalLink } from "lucide-react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { TextStyle, Color, FontFamily } from "@tiptap/extension-text-style"
import TextAlign from "@tiptap/extension-text-align"
import { Placeholder } from "@tiptap/extension-placeholder"
import Highlight from "@tiptap/extension-highlight"
import type { Product } from "@/lib/supabase"
import { adminFetch } from "@/lib/admin-client"
import { subirImagen } from "@/lib/admin-upload"
import { IMAGE_ACCEPT } from "@/lib/upload-limits"
import { PRODUCT_PLACEHOLDER } from "@/lib/placeholder"
import { EditorToolbar } from "./blogs"
import { imagePasteDropProps, ImagenFiel } from "../components/editor-media"

/**
 * Editor visual de la ficha del producto: réplica 1:1 del layout de la página
 * de ventas donde los textos se editan EN SU SITIO (título, descripción) y la
 * zona libre bajo la galería acepta contenido enriquecido (Tiptap). Guardar
 * escribe en /api/admin/products/[id] y la API revalida la ficha al instante.
 */

export function EditorPaginaProducto({ product, onClose, onSaved }: {
  product: Product
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [name, setName] = useState(product.name)
  const [descTitle, setDescTitle] = useState(product.description_title || "")
  const [desc, setDesc] = useState(product.description || "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [uploadingInline, setUploadingInline] = useState(false)
  const inlineRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } },
      }),
      TextStyle,
      Color,
      FontFamily,
      Highlight.configure({ multicolor: true }),
      ImagenFiel,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Escribe aquí lo que quieras mostrar debajo de la imagen del producto…" }),
    ],
    content: product.page_content || "",
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: { class: "blog-content focus:outline-none min-h-[200px]" },
      // Imágenes pegadas/arrastradas suben al servidor (igual que en el blog).
      ...imagePasteDropProps(setError),
    },
  })

  // Huella de lo último GUARDADO (no del prop, que no se refresca tras
  // guardar): sin esto, "Volver" avisaba de cambios sin guardar ya guardados.
  const savedRef = useRef<string | null>(null)
  function fingerprint(n: string, dt: string, d: string, content: string) {
    return JSON.stringify({ n, dt, d, content })
  }
  function hasChanges() {
    const current = fingerprint(name, descTitle, desc, editor?.getHTML() || "")
    const base = savedRef.current ?? fingerprint(
      product.name,
      product.description_title || "",
      product.description || "",
      editor ? (product.page_content || "<p></p>") : "",
    )
    return current !== base
  }

  function requestClose() {
    if (hasChanges() && !confirm("Tienes cambios sin guardar. ¿Salir sin guardarlos?")) return
    onClose()
  }

  async function handleInlineImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !editor) return
    setUploadingInline(true); setError("")
    const r = await subirImagen(file)
    setUploadingInline(false)
    if (inlineRef.current) inlineRef.current.value = ""
    if ("url" in r) editor.chain().focus().setImage({ src: r.url, alt: name }).run()
    else setError(r.error)
  }

  async function save() {
    if (!name.trim()) { setError("El título no puede quedar vacío."); return }
    setSaving(true); setError("")
    try {
      const res = await adminFetch(`/api/admin/products/${product.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: name.trim(),
          description_title: descTitle.trim() || null,
          description: desc,
          page_content: editor?.getHTML() || "",
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || "No se pudo guardar.")
        return
      }
      setSavedAt(new Date())
      setName(name.trim()); setDescTitle(descTitle.trim())
      savedRef.current = fingerprint(name.trim(), descTitle.trim(), desc, editor?.getHTML() || "")
      await onSaved()
    } catch {
      setError("Error de conexión.")
    } finally {
      setSaving(false)
    }
  }

  const images = Array.isArray(product.image_urls) && product.image_urls.length
    ? product.image_urls
    : product.image_url ? [product.image_url] : []
  const [mainImage, setMainImage] = useState(images[0] || "")

  const editableRing = "rounded-xl outline-none ring-1 ring-dashed ring-[#A67163]/35 hover:ring-[#A67163]/70 focus:ring-2 focus:ring-[#A67163] transition-shadow px-2 py-1 -mx-2"

  return (
    <div className="space-y-4">
      {/* Barra superior del editor */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={requestClose} className="flex items-center gap-2 text-sm font-medium text-[#2D1A14]/60 hover:text-[#2D1A14] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver al inventario
        </button>
        <p className="text-xs text-[#2D1A14]/40 hidden sm:block">
          Editando la página de <span className="font-semibold text-[#2D1A14]/70">{product.name}</span> — los recuadros punteados se editan directamente.
        </p>
        <div className="flex-1" />
        <a
          href={`/productos/${product.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-medium text-[#A67163] hover:underline"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Ver página real
        </a>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 h-9 rounded-xl bg-[#2D1A14] hover:bg-[#3D2A24] text-white text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar cambios
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
        </p>
      )}
      {savedAt && !error && (
        <p className="text-[11px] text-green-700/80">
          Guardado a las {savedAt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })} — los cambios ya se ven en la página.
        </p>
      )}

      {/* ── Réplica 1:1 de la ficha de ventas ── */}
      <div className="bg-background rounded-2xl border border-[#2D1A14]/10 shadow-sm overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-8 py-10">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">

            {/* Columna izquierda: galería + zona libre */}
            <div>
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-muted/30">
                {mainImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mainImage} alt={name} className="w-full h-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={PRODUCT_PLACEHOLDER} alt="" className="w-full h-full object-cover" />
                )}
                {product.badge && (
                  <div className="absolute top-4 left-4">
                    <span className={`${product.badge_color || "bg-primary"} text-white text-xs font-bold px-3 py-1.5 rounded-full`}>
                      {product.badge}
                    </span>
                  </div>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 mt-4">
                  {images.map((url, i) => (
                    <button
                      key={url}
                      onClick={() => setMainImage(url)}
                      className={`flex-shrink-0 w-16 h-16 rounded-xl border-2 overflow-hidden transition-all ${
                        mainImage === url ? "border-primary shadow-md" : "border-border hover:border-primary/50"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Imagen ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Zona libre bajo la galería (page_content) */}
              <div className="mt-8">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#A67163]">
                  Zona libre — escribe lo que quieras mostrar aquí
                </p>
                {editor && <EditorToolbar editor={editor} onInsertImage={() => inlineRef.current?.click()} uploading={uploadingInline} />}
                <input ref={inlineRef} type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={handleInlineImage} />
                <div
                  className="mt-3 rounded-xl ring-1 ring-dashed ring-[#A67163]/35 hover:ring-[#A67163]/70 focus-within:ring-2 focus-within:ring-[#A67163] transition-shadow p-4 cursor-text"
                  onClick={() => editor?.chain().focus().run()}
                >
                  <EditorContent editor={editor} />
                </div>
              </div>
            </div>

            {/* Columna derecha: info del producto (título y descripción editables) */}
            <div className="flex flex-col gap-7 lg:pt-2">
              {/* Título — mismo estilo que el h1 de la ficha */}
              <textarea
                value={name}
                onChange={(e) => setName(e.target.value.replace(/\n/g, " "))}
                rows={2}
                className={`w-full resize-none bg-transparent font-serif text-[2rem] lg:text-[2.75rem] font-bold text-foreground leading-[1.08] tracking-tight ${editableRing}`}
                onInput={(e) => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = `${t.scrollHeight}px` }}
              />

              {/* Precio (solo lectura aquí; se cambia en el editor del inventario) */}
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-[2.15rem] font-semibold text-foreground tracking-tight leading-none">
                  ${product.price.toLocaleString("es-CO")}
                  <span className="text-sm font-normal text-muted-foreground ml-1.5">COP</span>
                </span>
                {product.original_price && (
                  <span className="text-base text-muted-foreground/70 line-through">
                    ${product.original_price.toLocaleString("es-CO")}
                  </span>
                )}
              </div>

              {/* Botón de compra decorativo (la réplica no vende) */}
              <div className="space-y-2.5 pointer-events-none select-none opacity-90">
                <div className="h-[52px] rounded-2xl bg-primary flex items-center justify-center text-white font-semibold">
                  Agregar al carrito
                </div>
                <div className="h-[52px] rounded-2xl border border-foreground/15 flex items-center justify-center text-foreground/80 font-medium">
                  Comprar ahora
                </div>
              </div>

              <div className="flex items-center gap-6 pt-1 pointer-events-none select-none text-foreground/55">
                <span className="flex items-center gap-2 text-sm"><Heart className="w-4 h-4" /> Añadir a favoritos</span>
                <span className="flex items-center gap-2 text-sm"><Share2 className="w-4 h-4" /> Compartir</span>
              </div>

              {/* Título de la descripción (opcional) */}
              <input
                value={descTitle}
                onChange={(e) => setDescTitle(e.target.value)}
                placeholder="Título de la descripción (opcional)…"
                className={`w-full bg-transparent font-serif text-lg text-foreground leading-snug placeholder:text-foreground/30 ${editableRing}`}
              />
              {/* Descripción — mismo estilo que el párrafo de la ficha */}
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Descripción del producto…"
                rows={5}
                className={`w-full resize-y bg-transparent text-[15px] text-muted-foreground leading-[1.75] placeholder:text-foreground/30 ${editableRing}`}
              />

              {/* Trust signals — misma fila que la ficha */}
              <div className="grid grid-cols-3 pt-5 mt-1 border-t border-foreground/[0.06] divide-x divide-foreground/[0.06] pointer-events-none select-none">
                {[
                  { Icon: Truck, label: "Envío gratis +$300k" },
                  { Icon: ShieldCheck, label: "Pago 100% seguro" },
                  { Icon: BadgeCheck, label: "30 días garantía" },
                ].map(({ Icon, label }) => (
                  <div key={label} className="flex flex-col items-center text-center gap-2 px-2 py-1">
                    <Icon className="w-[18px] h-[18px] text-primary" />
                    <span className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground leading-tight">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
