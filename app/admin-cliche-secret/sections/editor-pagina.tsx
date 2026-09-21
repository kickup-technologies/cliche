"use client"

import { useRef, useState } from "react"
import { ArrowLeft, Save, RefreshCw, AlertCircle, Heart, Share2, Truck, ShieldCheck, BadgeCheck, ExternalLink, Upload, Trash2, ImagePlus, Plus } from "lucide-react"
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
import { EditorToolbar } from "./blogs"
import { imagePasteDropProps, ImagenFiel } from "../components/editor-media"

/**
 * Editor visual de la ficha del producto: réplica 1:1 del layout de la página
 * de ventas donde CADA pieza se edita EN SU SITIO — título, precio (que es el
 * MISMO que cobra el checkout: el servidor siempre factura el de la BD),
 * descripción, y la galería (clic en la foto para reemplazarla o eliminarla,
 * miniaturas para añadir). La zona libre bajo la galería acepta contenido
 * enriquecido (Tiptap). Guardar escribe en /api/admin/products/[id] y la API
 * revalida la ficha al instante.
 *
 * `nuevo`: el producto AÚN no existe — la réplica es la DEMO sobre la que se
 * escribe, y el primer Guardar lo crea (POST, slug derivado del título).
 */

function autoSlug(name: string) {
  return "aroma-" + name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

export function EditorPaginaProducto({ product, nuevo = false, onClose, onSaved }: {
  product: Product
  nuevo?: boolean
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [name, setName] = useState(product.name)
  const [price, setPrice] = useState<number>(product.price)
  const [originalPrice, setOriginalPrice] = useState<number | null>(product.original_price ?? null)
  const [descTitle, setDescTitle] = useState(product.description_title || "")
  const [desc, setDesc] = useState(product.description || "")
  const [images, setImages] = useState<string[]>(
    Array.isArray(product.image_urls) && product.image_urls.length
      ? product.image_urls
      : product.image_url ? [product.image_url] : [],
  )
  const [mainIdx, setMainIdx] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [uploadingInline, setUploadingInline] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const inlineRef = useRef<HTMLInputElement>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  // 'replace' cambia la foto activa; 'add' suma una nueva al final.
  const photoMode = useRef<"replace" | "add">("replace")
  // Tras el primer guardado de un producto nuevo, aquí viven su id/slug reales.
  const createdRef = useRef<{ id: string; slug: string } | null>(nuevo ? null : { id: product.id, slug: product.slug })

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
  function fingerprint(vals: unknown[]) { return JSON.stringify(vals) }
  function current() { return fingerprint([name, price, originalPrice, descTitle, desc, images, editor?.getHTML() || ""]) }
  function hasChanges() {
    const base = savedRef.current ?? fingerprint([
      product.name, product.price, product.original_price ?? null,
      product.description_title || "", product.description || "",
      Array.isArray(product.image_urls) && product.image_urls.length ? product.image_urls : product.image_url ? [product.image_url] : [],
      editor ? (product.page_content || "<p></p>") : "",
    ])
    return current() !== base
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

  /** Subida desde el clic en la foto: reemplaza la activa o añade una nueva. */
  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploadingPhoto(true); setError("")
    const nuevos: string[] = []
    for (const f of files) {
      const r = await subirImagen(f)
      if ("url" in r) nuevos.push(r.url)
      else setError(r.error)
    }
    setUploadingPhoto(false)
    if (photoRef.current) photoRef.current.value = ""
    if (!nuevos.length) return
    setImages(prev => {
      if (photoMode.current === "replace" && prev.length) {
        const next = [...prev]
        next.splice(mainIdx, 1, ...nuevos)
        return next
      }
      return [...prev, ...nuevos]
    })
  }

  function removePhoto(idx: number) {
    setImages(prev => prev.filter((_, i) => i !== idx))
    setMainIdx(m => Math.max(0, Math.min(m > idx ? m - 1 : m, images.length - 2)))
  }

  async function save() {
    if (!name.trim()) { setError("El título no puede quedar vacío."); return }
    if (!price || price <= 0) { setError("El precio debe ser mayor a 0."); return }
    setSaving(true); setError("")
    try {
      const base = {
        name: name.trim(),
        price,
        original_price: originalPrice && originalPrice > price ? originalPrice : null,
        description_title: descTitle.trim() || null,
        description: desc,
        image_urls: images,
        image_url: images[0] || "",
        page_content: editor?.getHTML() || "",
      }
      // Producto nuevo: el primer Guardar lo CREA (slug desde el título) con
      // los valores de arranque; los siguientes ya son parches normales.
      const res = createdRef.current
        ? await adminFetch(`/api/admin/products/${createdRef.current.id}`, { method: "PUT", body: JSON.stringify(base) })
        : await adminFetch("/api/admin/products", {
            method: "POST",
            body: JSON.stringify({
              ...base, slug: autoSlug(name),
              category: product.category || "", stock: product.stock ?? 50,
              rating: product.rating ?? 4.8, reviews: product.reviews ?? 0,
              is_active: product.is_active ?? true,
            }),
          })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(d.error || "No se pudo guardar.")
        return
      }
      if (!createdRef.current) {
        const row = d?.id ? d : d?.product
        createdRef.current = { id: row?.id || "", slug: row?.slug || autoSlug(name) }
      }
      setSavedAt(new Date())
      setName(name.trim()); setDescTitle(descTitle.trim())
      savedRef.current = current()
      await onSaved()
    } catch {
      setError("Error de conexión.")
    } finally {
      setSaving(false)
    }
  }

  const mainImage = images[Math.min(mainIdx, Math.max(0, images.length - 1))] || ""
  const editableRing = "rounded-xl outline-none ring-1 ring-dashed ring-[#A67163]/35 hover:ring-[#A67163]/70 focus:ring-2 focus:ring-[#A67163] transition-shadow px-2 py-1 -mx-2"

  return (
    <div className="space-y-4">
      {/* Barra superior del editor */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={requestClose} className="flex items-center gap-2 text-sm font-medium text-[#2D1A14]/60 hover:text-[#2D1A14] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver al inventario
        </button>
        <p className="text-xs text-[#2D1A14]/40 hidden sm:block">
          Todo se edita en su sitio: haz clic en la foto, el título, el precio o cualquier texto.
        </p>
        <div className="flex-1" />
        {createdRef.current && (
          <a
            href={`/productos/${createdRef.current.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium text-[#A67163] hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Ver página real
          </a>
        )}
        <button onClick={save} disabled={saving} className="btnp btnp-dark">
          {saving ? <RefreshCw className="animate-spin" /> : <Save />}
          {createdRef.current ? "Guardar cambios" : "Crear producto"}
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

      <input ref={photoRef} type="file" accept={IMAGE_ACCEPT} multiple className="hidden" onChange={handlePhoto} />

      {/* ── Réplica 1:1 de la ficha de ventas ── */}
      <div className="bg-background rounded-2xl border border-[#2D1A14]/10 shadow-sm overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-8 py-10">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">

            {/* Columna izquierda: galería editable + zona libre */}
            <div>
              {/* Foto principal: clic = reemplazar/eliminar (estilo Shopify) */}
              <div className="group relative aspect-square w-full overflow-hidden rounded-2xl bg-muted/30 ring-1 ring-dashed ring-[#A67163]/25 hover:ring-[#A67163]/60 transition-shadow">
                {mainImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mainImage} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <button
                    onClick={() => { photoMode.current = "add"; photoRef.current?.click() }}
                    className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#2D1A14]/35 hover:text-[#A67163]"
                  >
                    <ImagePlus className="w-8 h-8" />
                    <span className="text-sm font-semibold">Subir la primera foto</span>
                  </button>
                )}
                {product.badge && (
                  <div className="absolute top-4 left-4 pointer-events-none">
                    <span className={`${product.badge_color || "bg-primary"} text-white text-xs font-bold px-3 py-1.5 rounded-full`}>
                      {product.badge}
                    </span>
                  </div>
                )}
                {mainImage && (
                  <div className="absolute inset-0 flex items-end justify-center pb-4 gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-[#2D1A14]/45 via-transparent to-transparent">
                    <button
                      onClick={() => { photoMode.current = "replace"; photoRef.current?.click() }}
                      disabled={uploadingPhoto}
                      className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-white text-[#2D1A14] text-xs font-semibold shadow hover:bg-[#FAF8F5] disabled:opacity-60"
                    >
                      {uploadingPhoto ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Reemplazar
                    </button>
                    <button
                      onClick={() => removePhoto(mainIdx)}
                      className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-white text-red-600 text-xs font-semibold shadow hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                    </button>
                  </div>
                )}
              </div>

              {/* Miniaturas: clic selecciona, ✕ elimina, + añade */}
              <div className="flex gap-2 overflow-x-auto pb-1 mt-4">
                {images.map((url, i) => (
                  <div key={url + i} className="relative group/thumb flex-shrink-0">
                    <button
                      onClick={() => setMainIdx(i)}
                      className={`w-16 h-16 rounded-xl border-2 overflow-hidden transition-all ${
                        i === mainIdx ? "border-primary shadow-md" : "border-border hover:border-primary/50"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Imagen ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                    {i === 0 && <span className="absolute bottom-0 inset-x-0 bg-[#2D1A14]/75 text-white text-[8px] font-semibold text-center rounded-b-[9px] pointer-events-none">PRINCIPAL</span>}
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-[#2D1A14]/15 text-[#2D1A14]/60 hover:text-red-600 items-center justify-center text-[10px] leading-none hidden group-hover/thumb:flex shadow"
                      title="Quitar esta foto"
                    >✕</button>
                  </div>
                ))}
                <button
                  onClick={() => { photoMode.current = "add"; photoRef.current?.click() }}
                  disabled={uploadingPhoto}
                  className="flex-shrink-0 w-16 h-16 rounded-xl border-2 border-dashed border-[#2D1A14]/20 flex flex-col items-center justify-center text-[#2D1A14]/35 hover:border-[#A67163]/60 hover:text-[#A67163] transition-colors disabled:opacity-50"
                  title="Añadir fotos"
                >
                  {uploadingPhoto ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-5 h-5" />}
                </button>
              </div>
              <p className="mt-1.5 text-[10px] text-[#2D1A14]/40">La 1ª foto es la principal de la ficha y el catálogo. Arriba puedes reemplazar o eliminar la foto que estés viendo.</p>

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

            {/* Columna derecha: info del producto (todo editable en su sitio) */}
            <div className="flex flex-col gap-7 lg:pt-2">
              {/* Título — mismo estilo que el h1 de la ficha */}
              <textarea
                value={name}
                onChange={(e) => setName(e.target.value.replace(/\n/g, " "))}
                placeholder="Nombre del producto"
                rows={2}
                className={`w-full resize-none bg-transparent font-serif text-[2rem] lg:text-[2.75rem] font-bold text-foreground leading-[1.08] tracking-tight placeholder:text-foreground/30 ${editableRing}`}
                onInput={(e) => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = `${t.scrollHeight}px` }}
              />

              {/* Precio EDITABLE en su sitio — es el precio REAL: el checkout
                  siempre factura el valor guardado en la BD. */}
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className={`inline-flex items-baseline gap-1 text-[2.15rem] font-semibold text-foreground tracking-tight leading-none ${editableRing}`}>
                  $
                  <input
                    type="text"
                    inputMode="numeric"
                    value={price ? price.toLocaleString("es-CO") : ""}
                    onChange={(e) => setPrice(Number(e.target.value.replace(/\D/g, "")) || 0)}
                    className="bg-transparent outline-none text-[2.15rem] font-semibold tracking-tight leading-none"
                    style={{ width: `${Math.max(String(price).length + Math.floor(String(price).length / 3), 4)}ch` }}
                    title="Precio en COP: haz clic y escribe — el checkout cobra este valor"
                  />
                  <span className="text-sm font-normal text-muted-foreground ml-1.5">COP</span>
                </span>
                <span className={`inline-flex items-baseline gap-1 text-base text-muted-foreground/70 line-through ${editableRing}`} title="Precio «antes» (tachado). Vacío = sin tachado; debe ser mayor al precio.">
                  $
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="antes"
                    value={originalPrice ? originalPrice.toLocaleString("es-CO") : ""}
                    onChange={(e) => setOriginalPrice(Number(e.target.value.replace(/\D/g, "")) || null)}
                    className="bg-transparent outline-none text-base line-through w-[7ch] placeholder:no-underline placeholder:text-foreground/25"
                  />
                </span>
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
