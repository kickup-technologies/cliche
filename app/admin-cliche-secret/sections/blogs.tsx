"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Newspaper, Plus, ArrowLeft, Save, Trash2, RefreshCw, AlertCircle, Upload,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Undo2, Redo2,
  Heading2, Heading3, Pilcrow, List, ListOrdered, Quote, Minus as MinusIcon,
  AlignLeft, AlignCenter, AlignRight, Link2, Link2Off, ImageIcon, Highlighter,
  Eye, EyeOff, ExternalLink, Baseline, FileUp,
} from "lucide-react"
import { useEditor, EditorContent, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
// Tiptap v3: underline y link vienen DENTRO de StarterKit (se configuran ahí);
// TextStyle/Color/FontFamily son exports con nombre de extension-text-style.
import { TextStyle, Color, FontFamily } from "@tiptap/extension-text-style"
import TextAlign from "@tiptap/extension-text-align"
import { Placeholder } from "@tiptap/extension-placeholder"
import Highlight from "@tiptap/extension-highlight"
import type { BlogPost } from "@/lib/supabase"
import { adminFetch } from "@/lib/admin-client"
import { subirImagen } from "@/lib/admin-upload"
import { IMAGE_ACCEPT } from "@/lib/upload-limits"
import { imagePasteDropProps, base64ToFile, ImagenFiel } from "../components/editor-media"

/**
 * Sección "Blog" — lista de artículos + editor tipo documento (Tiptap).
 * Guardar publica de inmediato: la API revalida /blog y /blog/[slug].
 */

// Palabras de relleno que un link SEO no necesita (artículos, preposiciones…).
const STOPWORDS = new Set([
  "de", "del", "la", "el", "los", "las", "lo", "le", "les", "un", "una", "unos", "unas",
  "y", "e", "o", "u", "a", "al", "que", "se", "su", "sus", "tu", "tus", "mi", "mis",
  "en", "con", "sin", "por", "para", "como", "mas", "es", "son", "ser", "hay",
  "tambien", "pueda", "puede", "pueden", "muy", "the", "of", "and", "for", "to", "in",
])

/**
 * Slug automático optimizado para SEO: solo las palabras con significado del
 * título (sin "de", "para", "que"…), máximo 5 y ~45 caracteres. Un título como
 * "Marketing olfativo para empresas: beneficios y razones…" genera
 * "marketing-olfativo-empresas-beneficios". La dueña puede editarlo a mano en
 * el campo "Link" del editor.
 */
function autoSlug(title: string) {
  const words = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
  // Si al quitar el relleno quedan muy pocas palabras, se conserva el título tal cual.
  const significant = words.filter((w) => !STOPWORDS.has(w))
  let chosen = (significant.length >= 2 ? significant : words).slice(0, 5)
  while (chosen.length > 2 && chosen.join("-").length > 45) chosen = chosen.slice(0, -1)
  return chosen.join("-")
}

/** Normaliza lo tecleado en el campo de link (permite guiones mientras se escribe). */
function normalizeSlugInput(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9-]+/g, "-").replace(/-{2,}/g, "-").replace(/^-+/, "")
}

const fecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }) : "—"

// Paleta de texto: colores de la marca primero.
const TEXT_COLORS = [
  { value: "#2D1A14", label: "Café oscuro" },
  { value: "#A67163", label: "Terracota" },
  { value: "#8B5A4A", label: "Cobre" },
  { value: "#7A5C52", label: "Topo" },
  { value: "#1F2937", label: "Gris" },
  { value: "#B91C1C", label: "Rojo" },
  { value: "#166534", label: "Verde" },
  { value: "#1D4ED8", label: "Azul" },
]

const FONTS = [
  { value: "", label: "Texto (Inter)" },
  { value: "var(--font-serif), Georgia, serif", label: "Editorial (Playfair)" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "Courier New, monospace", label: "Monoespaciada" },
]

interface EditorState {
  post: Partial<BlogPost>
  originalSnapshot: string
}

function snapshot(p: Partial<BlogPost>, content: string): string {
  return JSON.stringify({
    title: p.title || "", slug: p.slug || "", excerpt: p.excerpt || "", cover_url: p.cover_url || "",
    published: p.published ?? true, content,
  })
}

// ── Botón de la toolbar ───────────────────────────────────────────────────────
function TBtn({ onClick, active, disabled, title, children }: {
  onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 ${
        active ? "bg-[#2D1A14] text-white" : "text-[#2D1A14]/70 hover:bg-[#2D1A14]/8"
      }`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-[#2D1A14]/10 mx-1 self-center" />
}

// ── Toolbar del editor (también la usa el editor visual de productos) ─────────
export function EditorToolbar({ editor, onInsertImage, uploading }: { editor: Editor; onInsertImage: () => void; uploading: boolean }) {
  const [colorOpen, setColorOpen] = useState(false)

  function setLink() {
    const prev = editor.getAttributes("link").href as string | undefined
    const url = window.prompt("Enlace (URL):", prev || "https://")
    if (url === null) return
    if (!url || url === "https://") { editor.chain().focus().unsetLink().run(); return }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }

  const fontValue = (editor.getAttributes("textStyle").fontFamily as string) || ""

  return (
    <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border border-[#2D1A14]/10 rounded-2xl px-2 py-1.5 flex flex-wrap items-center gap-0.5 shadow-sm">
      <TBtn title="Deshacer" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}><Undo2 className="w-4 h-4" /></TBtn>
      <TBtn title="Rehacer" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}><Redo2 className="w-4 h-4" /></TBtn>
      <Divider />
      <select
        value={fontValue}
        onChange={(e) => {
          const v = e.target.value
          if (v) editor.chain().focus().setFontFamily(v).run()
          else editor.chain().focus().unsetFontFamily().run()
        }}
        className="h-8 px-2 rounded-lg border border-[#2D1A14]/10 bg-white text-xs text-[#2D1A14] focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
        title="Fuente"
      >
        {FONTS.map(f => <option key={f.label} value={f.value}>{f.label}</option>)}
      </select>
      <Divider />
      <TBtn title="Párrafo" onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive("paragraph")}><Pilcrow className="w-4 h-4" /></TBtn>
      <TBtn title="Título" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}><Heading2 className="w-4 h-4" /></TBtn>
      <TBtn title="Subtítulo" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })}><Heading3 className="w-4 h-4" /></TBtn>
      <Divider />
      <TBtn title="Negrita" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}><Bold className="w-4 h-4" /></TBtn>
      <TBtn title="Cursiva" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}><Italic className="w-4 h-4" /></TBtn>
      <TBtn title="Subrayado" onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")}><UnderlineIcon className="w-4 h-4" /></TBtn>
      <TBtn title="Tachado" onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")}><Strikethrough className="w-4 h-4" /></TBtn>
      <TBtn title="Resaltar" onClick={() => editor.chain().focus().toggleHighlight({ color: "#F5EDE8" }).run()} active={editor.isActive("highlight")}><Highlighter className="w-4 h-4" /></TBtn>

      {/* Color de texto */}
      <div className="relative">
        <TBtn title="Color de texto" onClick={() => setColorOpen(o => !o)} active={colorOpen}>
          <Baseline className="w-4 h-4" style={{ color: (editor.getAttributes("textStyle").color as string) || undefined }} />
        </TBtn>
        {colorOpen && (
          <div className="absolute top-9 left-0 z-20 bg-white border border-[#2D1A14]/10 rounded-xl p-2 shadow-lg flex flex-col gap-2">
            <div className="grid grid-cols-4 gap-1.5">
              {TEXT_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { editor.chain().focus().setColor(c.value).run(); setColorOpen(false) }}
                  className="w-6 h-6 rounded-full border border-[#2D1A14]/15"
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { editor.chain().focus().unsetColor().run(); setColorOpen(false) }}
              className="text-[11px] text-[#2D1A14]/60 hover:text-[#2D1A14]"
            >
              Quitar color
            </button>
          </div>
        )}
      </div>
      <Divider />
      {/* Alineación: si hay una imagen seleccionada la mueve a ella; si no,
          alinea el texto. La posición se publica tal cual se ve aquí. */}
      {(["left", "center", "right"] as const).map((align) => {
        const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight
        const label = align === "left" ? "izquierda" : align === "center" ? "centro" : "derecha"
        const onImage = editor.isActive("image")
        return (
          <TBtn
            key={align}
            title={onImage ? `Mover imagen a la ${label}` : `Alinear texto a la ${label}`}
            onClick={() =>
              onImage
                ? editor.chain().focus().updateAttributes("image", { align }).run()
                : editor.chain().focus().setTextAlign(align).run()
            }
            active={onImage ? editor.isActive("image", { align }) : editor.isActive({ textAlign: align })}
          >
            <Icon className="w-4 h-4" />
          </TBtn>
        )
      })}
      <Divider />
      <TBtn title="Lista" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}><List className="w-4 h-4" /></TBtn>
      <TBtn title="Lista numerada" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}><ListOrdered className="w-4 h-4" /></TBtn>
      <TBtn title="Cita" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")}><Quote className="w-4 h-4" /></TBtn>
      <TBtn title="Separador" onClick={() => editor.chain().focus().setHorizontalRule().run()}><MinusIcon className="w-4 h-4" /></TBtn>
      <Divider />
      <TBtn title="Enlace" onClick={setLink} active={editor.isActive("link")}><Link2 className="w-4 h-4" /></TBtn>
      <TBtn title="Quitar enlace" onClick={() => editor.chain().focus().unsetLink().run()} disabled={!editor.isActive("link")}><Link2Off className="w-4 h-4" /></TBtn>
      <TBtn title="Insertar imagen" onClick={onInsertImage} disabled={uploading}>
        {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
      </TBtn>
    </div>
  )
}

// ── Editor de un artículo ─────────────────────────────────────────────────────
function BlogEditor({ initial, onBack, onSaved }: {
  initial: Partial<BlogPost>
  onBack: () => void
  onSaved: () => Promise<void>
}) {
  const [post, setPost] = useState<Partial<BlogPost>>({ ...initial })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingInline, setUploadingInline] = useState(false)
  const [importing, setImporting] = useState(false)
  const coverRef = useRef<HTMLInputElement>(null)
  const inlineRef = useRef<HTMLInputElement>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const originalRef = useRef("")
  // Mientras el artículo es nuevo y la dueña no ha tocado el link, este se
  // genera solo (corto) a partir del título; al primer toque manual, manda ella.
  const slugTouched = useRef(!!initial.id)

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
      Placeholder.configure({ placeholder: "Escribe aquí tu artículo…" }),
    ],
    content: initial.content || "",
    immediatelyRender: false,
    // La toolbar pinta estados (negrita activa, imagen seleccionada…) y en
    // Tiptap v3 el re-render por transacción viene apagado por defecto.
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: { class: "blog-content focus:outline-none min-h-[50vh]" },
      // Imágenes pegadas o arrastradas: se suben al servidor y se inserta su
      // URL definitiva (antes quedaba un blob local → ícono roto al guardar).
      ...imagePasteDropProps(setError),
    },
  })

  useEffect(() => {
    originalRef.current = snapshot(initial, initial.content || "")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function setField<K extends keyof BlogPost>(key: K, value: BlogPost[K]) {
    setPost(prev => ({ ...prev, [key]: value }))
  }

  function hasChanges() {
    return snapshot(post, editor?.getHTML() || "") !== originalRef.current
  }

  function requestBack() {
    if (hasChanges() && !confirm("Tienes cambios sin guardar. ¿Salir sin guardarlos?")) return
    onBack()
  }

  async function handleCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCover(true); setError("")
    const r = await subirImagen(file)
    setUploadingCover(false)
    if (coverRef.current) coverRef.current.value = ""
    if ("url" in r) setField("cover_url", r.url)
    else setError(r.error)
  }

  async function handleInlineImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !editor) return
    setUploadingInline(true); setError("")
    const r = await subirImagen(file)
    setUploadingInline(false)
    if (inlineRef.current) inlineRef.current.value = ""
    if ("url" in r) editor.chain().focus().setImage({ src: r.url, alt: post.title || "" }).run()
    else setError(r.error)
  }

  /**
   * Importar un archivo con el artículo ya escrito (p. ej. descargado de
   * Google Docs como .docx). La estructura se conserva: títulos, negritas,
   * listas, citas y enlaces; las imágenes embebidas se SUBEN al servidor
   * para que no se corrompan al publicar.
   */
  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !editor) return
    if (importRef.current) importRef.current.value = ""
    const replace = editor.isEmpty
      ? true
      : confirm("¿Reemplazar el contenido actual con el del archivo? (Cancelar lo añade al final)")
    setImporting(true); setError("")
    try {
      const name = file.name.toLowerCase()
      let html = ""
      if (name.endsWith(".docx")) {
        const mammoth = await import("mammoth")
        const arrayBuffer = await file.arrayBuffer()
        const result = await mammoth.convertToHtml(
          { arrayBuffer },
          {
            // El H1 lo pone el título del post: los encabezados del documento
            // entran como H2/H3 para que la jerarquía de la página se conserve.
            styleMap: [
              "p[style-name='Title'] => h2:fresh",
              "p[style-name='Título'] => h2:fresh",
              "p[style-name='Subtitle'] => h3:fresh",
              "p[style-name='Subtítulo'] => h3:fresh",
            ],
            convertImage: mammoth.images.imgElement(async (image) => {
              try {
                const b64 = await image.readAsBase64String()
                const r = await subirImagen(base64ToFile(b64, image.contentType || "image/png"))
                if ("url" in r) return { src: r.url }
                // Si la subida falla, la imagen entra embebida (data:) para
                // no perderla; el sanitizador del servidor la permite.
                return { src: `data:${image.contentType};base64,${b64}` }
              } catch {
                return { src: "" }
              }
            }),
          },
        )
        html = result.value
          // mammoth deja h1 si el doc usa Heading 1: se baja a h2 (ver arriba).
          .replace(/<(\/?)h1>/g, "<$1h2>")
      } else if (name.endsWith(".html") || name.endsWith(".htm")) {
        const raw = await file.text()
        const bodyMatch = raw.match(/<body[^>]*>([\s\S]*)<\/body>/i)
        html = bodyMatch ? bodyMatch[1] : raw
      } else if (name.endsWith(".txt") || name.endsWith(".md")) {
        const text = await file.text()
        html = text
          .split(/\n{2,}/)
          .map(p => `<p>${p.trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>`)
          .join("")
      } else {
        setError("Formato no soportado. Sube un .docx (Google Docs → Archivo → Descargar → Word), .html o .txt.")
        return
      }
      if (!html.trim()) { setError("El archivo llegó vacío o no se pudo leer."); return }
      if (replace) editor.commands.setContent(html)
      else editor.chain().focus("end").insertContent(html).run()
      if (!post.title?.trim()) {
        setField("title", file.name.replace(/\.(docx|html?|txt|md)$/i, "").replace(/[-_]+/g, " "))
      }
    } catch (err) {
      console.error("[blog import]", err)
      setError("No se pudo leer el archivo. Verifica que sea un .docx válido e intenta de nuevo.")
    } finally {
      setImporting(false)
    }
  }

  /**
   * Guarda el artículo. `publish` fija la visibilidad explícitamente:
   * true = Publicar, false = guardar como borrador/ocultar, undefined = tal
   * como está. Botones separados: antes un toggle discreto dejaba artículos
   * en borrador sin que la dueña entendiera por qué no se publicaban.
   */
  async function save(publish?: boolean) {
    if (!editor) return
    const p = { ...post, content: editor.getHTML() }
    if (publish !== undefined) p.published = publish
    if (!p.title?.trim()) { setError("El título es obligatorio."); return }
    // Link definitivo: lo tecleado (sin guiones sueltos al final) o el automático.
    p.slug = (p.slug || "").replace(/^-+|-+$/g, "") || autoSlug(p.title)
    setSaving(true); setError("")
    try {
      const res = p.id
        ? await adminFetch(`/api/admin/blogs/${p.id}`, { method: "PUT", body: JSON.stringify(p) })
        : await adminFetch("/api/admin/blogs", { method: "POST", body: JSON.stringify(p) })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || "No se pudo guardar el artículo.")
        return
      }
      const saved: BlogPost = await res.json()
      setPost(saved)
      originalRef.current = snapshot(saved, editor.getHTML())
      setSavedAt(new Date())
      await onSaved()
    } catch {
      setError("Error de conexión.")
    } finally {
      setSaving(false)
    }
  }

  const published = post.published ?? true
  // "En vivo" = guardado Y publicado. Un artículo nuevo sin guardar todavía no
  // está en la página aunque el campo published venga en true por defecto.
  const isLive = published && !!post.id

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={requestBack} className="flex items-center gap-2 text-sm font-medium text-[#2D1A14]/60 hover:text-[#2D1A14] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
        <div className="flex-1" />
        <button
          onClick={() => importRef.current?.click()}
          disabled={importing}
          title="Importar un artículo escrito en Google Docs (descárgalo como .docx), HTML o texto"
          className="flex items-center gap-1.5 px-3 h-9 rounded-xl border border-[#2D1A14]/15 bg-white text-xs font-semibold text-[#2D1A14]/70 hover:border-[#A67163]/50 hover:text-[#A67163] transition-colors disabled:opacity-50"
        >
          {importing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}
          Importar de Word / Google Docs
        </button>
        <input
          ref={importRef}
          type="file"
          accept=".docx,.html,.htm,.txt,.md"
          className="hidden"
          onChange={handleImportFile}
        />
        {isLive && post.slug && (
          <a
            href={`/blog/${post.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium text-[#A67163] hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Ver en la página
          </a>
        )}
        {isLive ? (
          <>
            {/* Publicado: guardar actualiza la página; "Ocultar" lo despublica. */}
            <button
              onClick={() => save(false)}
              disabled={saving}
              title="Quitar el artículo de la página (queda guardado como oculto y puedes publicarlo de nuevo cuando quieras)"
              className="flex items-center gap-1.5 px-3 h-9 rounded-xl border border-[#2D1A14]/15 bg-white text-xs font-semibold text-[#2D1A14]/70 hover:border-amber-500/60 hover:text-amber-700 transition-colors disabled:opacity-50"
            >
              <EyeOff className="w-3.5 h-3.5" /> Ocultar de la página
            </button>
            <button
              onClick={() => save(true)}
              disabled={saving}
              className="flex items-center gap-2 px-4 h-9 rounded-xl bg-[#2D1A14] hover:bg-[#3D2A24] text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar cambios
            </button>
          </>
        ) : (
          <>
            {/* Oculto/borrador: el botón protagonista es PUBLICAR. */}
            <button
              onClick={() => save(false)}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 h-9 rounded-xl border border-[#2D1A14]/15 bg-white text-xs font-semibold text-[#2D1A14]/70 hover:border-[#A67163]/50 transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" /> Guardar borrador
            </button>
            <button
              onClick={() => save(true)}
              disabled={saving}
              className="flex items-center gap-2 px-4 h-9 rounded-xl bg-[#A67163] hover:bg-[#8B5A4A] text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              Publicar
            </button>
          </>
        )}
      </div>

      {/* Estado del artículo, siempre a la vista: la clienta sabe en todo
          momento si lo que tiene enfrente está en la página o no. */}
      <div className={`rounded-xl border px-4 py-3 flex items-start gap-2.5 ${
        isLive ? "border-green-600/25 bg-green-50" : "border-amber-400/40 bg-amber-50"
      }`}>
        {isLive ? <Eye className="w-4 h-4 text-green-700 mt-0.5 flex-shrink-0" /> : <EyeOff className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />}
        <div>
          <p className={`text-sm font-semibold ${isLive ? "text-green-800" : "text-amber-800"}`}>
            {isLive ? "Este artículo está publicado" : !post.id ? "Artículo nuevo — todavía no está en la página" : "Este artículo está oculto — no aparece en la página"}
          </p>
          <p className={`text-xs mt-0.5 ${isLive ? "text-green-700/80" : "text-amber-700/80"}`}>
            {isLive
              ? "Cualquier persona puede verlo en la página. Si cambias algo, pulsa «Guardar cambios» para que se actualice."
              : "Escribe con calma: nadie lo ve todavía. Cuando esté listo, pulsa el botón «Publicar» y aparecerá al instante en la página."}
          </p>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
        </p>
      )}
      {savedAt && !error && (
        <p className={`text-[11px] ${published ? "text-green-700/80" : "text-amber-700/80"}`}>
          {published
            ? `Publicado a las ${savedAt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })} — los cambios ya están en la página.`
            : `Guardado a las ${savedAt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })} como OCULTO — no aparece en la página hasta que pulses «Publicar».`}
        </p>
      )}

      {/* Hoja del documento */}
      <div className="bg-white rounded-2xl border border-[#2D1A14]/10 shadow-sm overflow-hidden">
        {/* Portada */}
        <div className="relative">
          {post.cover_url ? (
            // Sin recorte: la portada se muestra con su proporción real, igual
            // que en la publicación.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.cover_url} alt="Portada" className="w-full h-auto" />
          ) : (
            <div className="w-full h-36 bg-[#F5EDE8] flex flex-col items-center justify-center gap-1 px-4 text-center">
              <p className="text-sm font-medium text-[#2D1A14]/60">Imagen de portada</p>
              <p className="text-xs text-[#2D1A14]/40">Se muestra en grande arriba del título, tal cual aquí. Súbela con el botón de abajo a la derecha.</p>
            </div>
          )}
          <button
            onClick={() => coverRef.current?.click()}
            disabled={uploadingCover}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 h-8 rounded-lg bg-white/90 backdrop-blur border border-[#2D1A14]/10 text-xs font-medium text-[#2D1A14] hover:bg-white transition-colors shadow-sm"
          >
            {uploadingCover ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {post.cover_url ? "Cambiar portada" : "Subir portada"}
          </button>
          <input ref={coverRef} type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={handleCover} />
        </div>

        <div className="px-5 sm:px-10 py-8">
          {/* Título */}
          <textarea
            value={post.title || ""}
            onChange={(e) => {
              const title = e.target.value.replace(/\n/g, " ")
              setPost(prev => ({
                ...prev,
                title,
                ...(slugTouched.current ? {} : { slug: autoSlug(title) }),
              }))
            }}
            placeholder="Título del artículo"
            rows={1}
            className="w-full font-serif text-3xl sm:text-4xl font-bold text-[#2D1A14] placeholder:text-[#2D1A14]/25 resize-none focus:outline-none leading-tight"
            onInput={(e) => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = `${t.scrollHeight}px` }}
          />
          {/* Link del artículo: corto por defecto y editable a mano */}
          <div className="mt-2 flex flex-wrap items-center gap-1 text-xs">
            <span className="text-[#2D1A14]/40">Link:</span>
            <span className="text-[#2D1A14]/40 font-mono">clichecolombia.com/blog/</span>
            <input
              value={post.slug || ""}
              onChange={(e) => { slugTouched.current = true; setField("slug", normalizeSlugInput(e.target.value)) }}
              placeholder="mi-articulo"
              className="flex-1 min-w-[140px] font-mono text-xs text-[#A67163] bg-[#FAF8F5] border border-[#2D1A14]/10 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
            />
            {post.id && (
              <span className="text-[10px] text-amber-700/80 basis-full">
                Ojo: cambiar el link de un artículo ya publicado rompe los enlaces que ya compartiste con el link viejo.
              </span>
            )}
          </div>
          {/* Bajada / excerpt */}
          <textarea
            value={post.excerpt || ""}
            onChange={(e) => setField("excerpt", e.target.value)}
            placeholder="Bajada del artículo (un resumen corto que se muestra en la portada del blog)…"
            rows={2}
            className="mt-2 w-full text-base text-[#2D1A14]/60 placeholder:text-[#2D1A14]/25 resize-none focus:outline-none leading-relaxed"
          />

          <div className="my-5 h-px bg-[#2D1A14]/8" />

          {/* Toolbar + lienzo */}
          {editor && <EditorToolbar editor={editor} onInsertImage={() => inlineRef.current?.click()} uploading={uploadingInline} />}
          <input ref={inlineRef} type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={handleInlineImage} />
          <p className="mt-2 text-[11px] text-[#2D1A14]/40">
            💡 Tal como se ve aquí quedará en la página. Para mover una imagen: haz clic sobre ella y usa los botones de alinear (izquierda, centro, derecha), o arrástrala a otro punto del texto. También puedes pegar imágenes directamente.
          </p>
          <div className="mt-4 cursor-text" onClick={() => editor?.chain().focus().run()}>
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sección principal ─────────────────────────────────────────────────────────
export function BlogsSection() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<EditorState | null>(null)
  const [listError, setListError] = useState("")

  const load = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/blogs")
      const data = await res.json()
      setPosts(Array.isArray(data) ? data : [])
      if (!res.ok) setListError((data as { error?: string })?.error || "No se pudieron cargar los artículos.")
      else setListError("")
    } catch {
      setPosts([])
      setListError("No se pudieron cargar los artículos.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openNew() {
    const blank: Partial<BlogPost> = { title: "", excerpt: "", cover_url: "", content: "", published: true }
    setEditing({ post: blank, originalSnapshot: "" })
  }

  async function remove(p: BlogPost) {
    if (!confirm(`¿Eliminar el artículo «${p.title}»? Desaparecerá de la página y no se puede deshacer.`)) return
    setPosts(prev => prev.filter(x => x.id !== p.id))
    await adminFetch(`/api/admin/blogs/${p.id}`, { method: "DELETE" }).catch(() => load())
  }

  /** Mostrar/ocultar en la página sin abrir el editor (optimista). */
  async function toggleVisible(p: BlogPost) {
    setPosts(prev => prev.map(x => x.id === p.id ? { ...x, published: !p.published } : x))
    try {
      const res = await adminFetch(`/api/admin/blogs/${p.id}`, {
        method: "PUT",
        body: JSON.stringify({ published: !p.published }),
      })
      if (!res.ok) await load()
    } catch {
      await load()
    }
  }

  if (editing) {
    return (
      <BlogEditor
        initial={editing.post}
        onBack={() => setEditing(null)}
        onSaved={load}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#2D1A14] flex items-center gap-2">
            <Newspaper className="w-6 h-6 text-[#A67163]" /> Blog
          </h1>
          <p className="text-sm text-[#9e8a84] mt-1">
            Tus artículos de <span className="font-medium">clichecolombia.com/blog</span>. Los marcados
            <span className="font-semibold text-green-700"> Visible</span> aparecen en la página; los
            <span className="font-semibold"> Ocultos</span> no — actívalos con su botón o con «Publicar» dentro del artículo.
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 h-10 rounded-xl bg-[#2D1A14] hover:bg-[#3D2A24] text-white text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuevo artículo
        </button>
      </div>

      {listError && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-300/60 rounded-xl px-3 py-2 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" /> {listError}
        </p>
      )}

      {/* Recordatorio de ocultos: evita el "escribí mi blog y no aparece". */}
      {!loading && posts.some(p => !p.published) && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-300/60 rounded-xl px-3 py-2 flex items-center gap-1.5">
          <EyeOff className="w-3.5 h-3.5 flex-shrink-0" />
          {(() => { const n = posts.filter(p => !p.published).length; return n === 1
            ? "Tienes 1 artículo oculto: no aparece en la página. Pulsa su botón «Oculto» para publicarlo."
            : `Tienes ${n} artículos ocultos: no aparecen en la página. Pulsa su botón «Oculto» para publicarlos.` })()}
        </p>
      )}

      {loading ? (
        <div className="py-20 flex justify-center"><RefreshCw className="w-6 h-6 animate-spin text-[#A67163]" /></div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-[#2D1A14]/15 py-16 text-center">
          <Newspaper className="w-10 h-10 text-[#2D1A14]/20 mx-auto mb-3" />
          <p className="text-sm font-medium text-[#2D1A14]/60">Todavía no hay artículos</p>
          <p className="text-xs text-[#2D1A14]/40 mt-1">Escribe el primero con el botón «Nuevo artículo».</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {posts.map(p => (
            <div
              key={p.id}
              onClick={() => setEditing({ post: p, originalSnapshot: "" })}
              className="group bg-white rounded-2xl border border-[#2D1A14]/10 p-3 sm:p-4 flex items-center gap-4 cursor-pointer hover:border-[#A67163]/40 hover:shadow-sm transition-all"
            >
              {p.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.cover_url} alt="" className="w-20 h-14 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-20 h-14 rounded-xl bg-[#F5EDE8] flex items-center justify-center flex-shrink-0">
                  <Newspaper className="w-5 h-5 text-[#2D1A14]/25" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#2D1A14] text-sm truncate">{p.title}</p>
                {p.excerpt && <p className="text-xs text-[#2D1A14]/50 truncate mt-0.5">{p.excerpt}</p>}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    p.published ? "bg-green-100 text-green-700" : "bg-[#2D1A14]/8 text-[#2D1A14]/50"
                  }`}>
                    {p.published ? "Publicado" : "Oculto"}
                  </span>
                  <span className="text-[11px] text-[#2D1A14]/40">{fecha(p.published_at || p.created_at)}</span>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); toggleVisible(p) }}
                className={`flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-[11px] font-semibold border transition-colors flex-shrink-0 ${
                  p.published
                    ? "border-green-600/30 bg-green-50 text-green-700 hover:border-amber-500/60 hover:bg-amber-50 hover:text-amber-700"
                    : "border-[#2D1A14]/15 bg-white text-[#2D1A14]/50 hover:border-green-600/40 hover:text-green-700"
                }`}
                title={p.published ? "Ocultar de la página" : "Publicar en la página"}
              >
                {p.published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {p.published ? "Visible" : "Oculto"}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); remove(p) }}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-[#2D1A14]/30 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                title="Eliminar artículo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
