"use client"
import { useState, useRef, useEffect } from "react"
import { Plus, Pencil, Minus, RefreshCw, Save, X, AlertCircle, ToggleLeft, ToggleRight, Upload, ImageIcon, Trash2 } from "lucide-react"
import { fmt } from "../types"
import type { Product } from "@/lib/supabase"
import { adminFetch } from "@/lib/admin-client"
import { PRODUCT_PLACEHOLDER } from "@/lib/placeholder"
import { imageProblem, IMAGE_ACCEPT, MAX_IMAGE_MB } from "@/lib/upload-limits"
import { Ayuda } from "../components/ayuda"

// Categorías (familias olfativas) que el admin asigna al producto. Deben
// coincidir con las del catálogo (app/catalogo/page.tsx → FAMILIES).
const CATEGORIES = [
  { value: "citricos", label: "Cítricos" },
  { value: "florales", label: "Florales" },
  { value: "amaderados", label: "Amaderados" },
  { value: "dulces", label: "Dulces" },
  { value: "frescos", label: "Frescos" },
] as const

/**
 * Sube una imagen y devuelve su URL, o el motivo exacto del fallo en español.
 *
 * Antes devolvía null y la dueña solo veía «No se pudo subir la imagen»: sin
 * saber si la foto pesaba de más, si era un HEIC del iPhone o si se le había
 * vencido la sesión. Ahora se revisa el archivo ANTES de subirlo (así no espera
 * la subida entera de una foto de 9 MB para enterarse) y el mensaje dice qué
 * hacer.
 */
async function uploadImage(file: File): Promise<{ url: string } | { error: string }> {
  const problema = imageProblem(file)
  if (problema) return { error: problema }

  const fd = new FormData()
  fd.append("file", file)
  try {
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd })
    if (res.status === 401) return { error: "La sesión del panel expiró. Vuelve a entrar y sube la foto de nuevo." }
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
    if (!res.ok || !data.url) {
      return { error: data.error || `No se pudo subir «${file.name}». Intenta de nuevo.` }
    }
    return { url: data.url }
  } catch {
    return { error: `Se cortó la conexión al subir «${file.name}». Revisa tu internet e intenta otra vez.` }
  }
}

function autoSlug(name: string) {
  return "aroma-" + name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

/** Lista efectiva de imágenes del producto (image_urls, o image_url suelta). */
function imagesOf(p: Partial<Product> | null): string[] {
  if (!p) return []
  if (Array.isArray(p.image_urls) && p.image_urls.length) return p.image_urls
  return p.image_url ? [p.image_url] : []
}

export function InventarioSection({ products, onRefresh }: { products: Product[]; onRefresh: () => Promise<void> }) {
  const [modal, setModal] = useState<{ open: boolean; product: Partial<Product> | null }>({ open: false, product: null })
  const [modalSaving, setModalSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [modalError, setModalError] = useState("")
  const [uploadProgress, setUploadProgress] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  // Errores de los controles rápidos de la parrilla (stock, visible/oculto):
  // antes fallaban en silencio y el número volvía atrás sin explicación.
  const [gridError, setGridError] = useState("")
  // Stock que la dueña ya pulsó pero que aún no confirmó el servidor. Sin esto,
  // tres clics seguidos en "+" partían todos del mismo stock viejo y solo
  // subía una unidad.
  const [pendingStock, setPendingStock] = useState<Record<string, number>>({})
  const stockTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // Si se sale de la sección con una escritura de stock en cola, se cancela el
  // temporizador (React avisaría de un setState sobre un componente muerto).
  useEffect(() => {
    const timers = stockTimers.current
    return () => { Object.values(timers).forEach(clearTimeout) }
  }, [])

  function openEdit(product: Product) {
    setModalError("")
    setModal({ open: true, product: { ...product } })
  }
  function openNew() {
    setModalError("")
    setModal({ open: true, product: { name: "", slug: "", price: 78000, original_price: null, description: "", category: "", image_urls: [], stock: 50, rating: 4.8, reviews: 0, is_active: true } })
  }
  function closeModal() { setModal({ open: false, product: null }); setModalError("") }

  function setField(key: string, value: string | number | boolean | string[] | null) {
    setModal(prev => ({ ...prev, product: { ...prev.product, [key]: value } }))
  }

  // Subir una o varias imágenes de referencia: se agregan a image_urls y la
  // primera es la principal (image_url).
  async function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploadProgress(true); setModalError("")
    const uploaded: string[] = []
    const fallos: string[] = []
    for (const f of files) {
      const r = await uploadImage(f)
      if ("url" in r) uploaded.push(r.url)
      else fallos.push(r.error)
    }
    setUploadProgress(false)
    if (fileRef.current) fileRef.current.value = ""
    // Las que sí subieron se quedan; las que no, se explican una por una (antes
    // los fallos parciales pasaban en silencio y faltaban fotos sin aviso).
    if (uploaded.length) {
      const all = [...imagesOf(modal.product), ...uploaded]
      setModal(prev => ({ ...prev, product: { ...prev.product, image_urls: all, image_url: all[0] } }))
    }
    if (fallos.length) setModalError(fallos.join(" "))
  }
  function removeImage(idx: number) {
    const all = imagesOf(modal.product).filter((_, i) => i !== idx)
    setModal(prev => ({ ...prev, product: { ...prev.product, image_urls: all, image_url: all[0] || "" } }))
  }
  function makeMain(idx: number) {
    const all = imagesOf(modal.product)
    if (idx <= 0 || idx >= all.length) return
    const reordered = [all[idx], ...all.filter((_, i) => i !== idx)]
    setModal(prev => ({ ...prev, product: { ...prev.product, image_urls: reordered, image_url: reordered[0] } }))
  }

  async function saveProduct() {
    if (!modal.product) return
    const p = { ...modal.product }
    if (!p.name?.trim()) { setModalError("El título es obligatorio"); return }
    if (!p.price || Number(p.price) <= 0) { setModalError("El precio debe ser mayor a 0"); return }
    // Slug automático desde el título (no se pide al usuario).
    if (!p.slug?.trim()) p.slug = autoSlug(p.name)
    // Normalizar imágenes: la primera es la principal.
    const imgs = imagesOf(p)
    p.image_urls = imgs
    p.image_url = imgs[0] || ""
    setModalSaving(true); setModalError("")
    try {
      const res = p.id
        ? await adminFetch(`/api/admin/products/${p.id}`, { method: "PUT", body: JSON.stringify(p) })
        : await adminFetch("/api/admin/products", { method: "POST", body: JSON.stringify(p) })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "" }))
        throw new Error(error || "Error al guardar")
      }
      await onRefresh(); closeModal()
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Error al guardar")
    } finally { setModalSaving(false) }
  }

  async function deleteProduct() {
    if (!modal.product?.id) return
    if (!confirm(`¿Eliminar "${modal.product.name}" de la tienda? Esta acción no se puede deshacer.`)) return
    setDeleting(true); setModalError("")
    try {
      const res = await adminFetch(`/api/admin/products/${modal.product.id}`, { method: "DELETE" })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "" }))
        throw new Error(error || "No se pudo eliminar")
      }
      await onRefresh(); closeModal()
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "No se pudo eliminar")
    } finally { setDeleting(false) }
  }

  /** Mensaje de error de una respuesta del API (o "" si todo fue bien). */
  async function errorOf(res: Response): Promise<string> {
    if (res.ok) return ""
    if (res.status === 401) return "La sesión del panel expiró. Vuelve a entrar."
    const { error } = await res.json().catch(() => ({ error: "" }))
    return error || "No se pudo guardar el cambio"
  }

  /**
   * Suma/resta unidades al stock. El número se actualiza al instante y la
   * escritura se agrupa: si la dueña pulsa "+" cinco veces, se guarda una sola
   * vez el valor final (y ninguna pulsación se pierde).
   */
  function bumpStock(product: Product, delta: number) {
    const id = product.id
    const current = pendingStock[id] ?? product.stock
    const next = Math.max(0, current + delta)
    setPendingStock(prev => ({ ...prev, [id]: next }))
    setGridError("")

    clearTimeout(stockTimers.current[id])
    stockTimers.current[id] = setTimeout(async () => {
      delete stockTimers.current[id]
      try {
        const res = await adminFetch(`/api/admin/products/${id}`, { method: "PUT", body: JSON.stringify({ stock: next }) })
        const msg = await errorOf(res)
        if (msg) setGridError(msg)
        await onRefresh()
      } catch {
        setGridError("Error de conexión al guardar el stock")
      } finally {
        // Solo se suelta el valor optimista si no llegaron más clics entretanto.
        if (!stockTimers.current[id]) {
          setPendingStock(prev => { const n = { ...prev }; delete n[id]; return n })
        }
      }
    }, 500)
  }

  async function toggleProduct(id: string, is_active: boolean) {
    setGridError("")
    try {
      const res = await adminFetch(`/api/admin/products/${id}`, { method: "PUT", body: JSON.stringify({ is_active }) })
      const msg = await errorOf(res)
      if (msg) setGridError(msg)
      await onRefresh()
    } catch {
      setGridError("Error de conexión al cambiar la visibilidad")
    }
  }

  const modalImages = imagesOf(modal.product)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#2D1A14]">Inventario</h2>
          <p className="text-sm text-[#2D1A14]/50 mt-0.5">
            {products.length} productos · {products.filter(p => p.stock <= 5).length} con stock bajo
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-[#2D1A14] text-white hover:bg-[#3D2A24] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Nuevo producto
        </button>
      </div>

      {gridError && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {gridError}
        </div>
      )}

      {/* Parrilla igual a la página de ventas: cada cuadro es el producto tal
          como lo ve el cliente. Un clic en el cuadro abre el editor. */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map(product => {
          // Stock que se le muestra a la dueña: el que ya pulsó, aunque el
          // servidor todavía no haya confirmado.
          const stock = pendingStock[product.id] ?? product.stock
          return (
          <div
            key={product.id}
            onClick={() => openEdit(product)}
            role="button"
            tabIndex={0}
            /* Solo el cuadro abre el editor: si el foco está en un control
               rápido (stock, visible/oculto), Enter/Espacio son suyos. */
            onKeyDown={e => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openEdit(product) } }}
            className="group text-left flex flex-col bg-white rounded-2xl border border-[#2D1A14]/8 overflow-hidden hover:border-[#A67163]/40 hover:shadow-[0_18px_40px_-26px_rgba(45,26,20,0.45)] transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
          >
            <div className="relative aspect-[4/5] w-full bg-[#FAF8F5] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.image_url || PRODUCT_PLACEHOLDER}
                alt={product.name}
                className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04] ${product.is_active ? "" : "opacity-40 grayscale"}`}
              />
              <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                {!product.is_active && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#2D1A14]/80 text-white">Oculto</span>
                )}
                {stock === 0 ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-600 text-white">Agotado</span>
                ) : stock <= 5 ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500 text-white">Stock bajo</span>
                ) : null}
              </div>
              <span className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-white/90 border border-[#2D1A14]/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Pencil className="w-3.5 h-3.5 text-[#2D1A14]/60" />
              </span>
            </div>

            <div className="p-3 flex flex-col gap-2 flex-1">
              <div className="min-w-0">
                <p className="font-semibold text-sm text-[#2D1A14] truncate">{product.name}</p>
                <p className="text-sm text-[#A67163] mt-0.5">{fmt(product.price)}</p>
              </div>

              {/* Controles rápidos: no abren el editor. */}
              <div className="mt-auto flex items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => bumpStock(product, -1)}
                    disabled={stock === 0}
                    className="w-7 h-7 rounded-lg border border-[#2D1A14]/15 hover:bg-[#FAF8F5] flex items-center justify-center disabled:opacity-40"
                    title="Quitar una unidad"
                  >
                    <Minus className="w-3 h-3 text-[#2D1A14]" />
                  </button>
                  <span className={`w-7 text-center font-bold text-sm ${stock <= 5 ? "text-red-500" : "text-[#2D1A14]"}`}>
                    {stock}
                  </span>
                  <button
                    onClick={() => bumpStock(product, 1)}
                    className="w-7 h-7 rounded-lg border border-[#2D1A14]/15 hover:bg-[#FAF8F5] flex items-center justify-center"
                    title="Agregar una unidad"
                  >
                    <Plus className="w-3 h-3 text-[#2D1A14]" />
                  </button>
                </div>
                <button
                  onClick={() => toggleProduct(product.id, !product.is_active)}
                  className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full border transition-colors ${product.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-[#2D1A14]/5 text-[#2D1A14]/40 border-[#2D1A14]/10"}`}
                  title={product.is_active ? "Ocultar de la tienda" : "Mostrar en la tienda"}
                >
                  {product.is_active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                  {product.is_active ? "Activo" : "Oculto"}
                </button>
              </div>
            </div>
          </div>
          )
        })}

        {/* Cuadro "Añadir": abre la misma ficha, en blanco. */}
        <button
          onClick={openNew}
          className="flex flex-col items-center justify-center gap-2 min-h-[220px] rounded-2xl border-2 border-dashed border-[#2D1A14]/20 bg-white/50 text-[#2D1A14]/40 hover:border-[#A67163]/50 hover:text-[#A67163] hover:bg-white transition-colors"
        >
          <Plus className="w-7 h-7" />
          <span className="text-sm font-semibold">Añadir producto</span>
        </button>
      </div>

      {/* Product Modal — formulario simple */}
      {modal.open && modal.product && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={closeModal}>
          <div
            className="bg-white rounded-2xl border border-[#2D1A14]/10 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-[#2D1A14]/8 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="font-serif font-bold text-[#2D1A14]">
                {modal.product.id ? "Editar producto" : "Nuevo producto"}
              </h3>
              <button onClick={closeModal} className="w-8 h-8 rounded-lg hover:bg-[#FAF8F5] flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Título */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-xs font-semibold text-[#2D1A14]/50 uppercase tracking-wide">Título del producto *</label>
                  <Ayuda tema="tituloProducto" align="left" />
                </div>
                <input
                  type="text"
                  value={modal.product.name || ""}
                  onChange={e => setField("name", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#2D1A14]/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
                  placeholder="Ej: Aroma Tao"
                />
              </div>

              {/* Categoría */}
              <div>
                <label className="text-xs font-semibold text-[#2D1A14]/50 uppercase tracking-wide mb-1.5 block">Categoría</label>
                <select
                  value={modal.product.category || ""}
                  onChange={e => setField("category", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#2D1A14]/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
                >
                  <option value="">— Elegir categoría —</option>
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Imágenes de referencia (varias) */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-xs font-semibold text-[#2D1A14]/50 uppercase tracking-wide">Imágenes de referencia</label>
                  <Ayuda tema="imagenesProducto" align="left" />
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {modalImages.map((src, i) => (
                    <div key={src + i} className="relative w-20 h-20 rounded-xl border border-[#2D1A14]/15 bg-[#FAF8F5] overflow-hidden group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`Imagen ${i + 1}`} className="w-full h-full object-contain" />
                      {i === 0 ? (
                        <span className="absolute bottom-0 inset-x-0 bg-[#2D1A14]/80 text-white text-[9px] font-semibold text-center py-0.5">Principal</span>
                      ) : (
                        <button type="button" onClick={() => makeMain(i)} className="absolute bottom-0 inset-x-0 bg-black/40 text-white text-[9px] font-semibold text-center py-0.5 opacity-0 group-hover:opacity-100 transition-opacity" title="Hacer principal">Hacer principal</button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white/90 border border-[#2D1A14]/10 flex items-center justify-center text-[#2D1A14]/60 hover:text-red-600"
                        title="Quitar"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadProgress}
                    className="w-20 h-20 rounded-xl border-2 border-dashed border-[#2D1A14]/20 bg-[#FAF8F5] flex flex-col items-center justify-center gap-1 text-[#2D1A14]/40 hover:border-[#A67163]/50 hover:text-[#A67163] transition-colors disabled:opacity-50"
                  >
                    {uploadProgress ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><Upload className="w-5 h-5" /><span className="text-[10px] font-medium">Subir</span></>}
                  </button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept={IMAGE_ACCEPT}
                  multiple
                  onChange={handleFilesChange}
                  className="hidden"
                />
                <p className="text-[11px] text-[#2D1A14]/40 mt-2 flex items-start gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
                  <span>
                    {modalImages.length === 0 && "Sube una o varias fotos. La primera será la principal. "}
                    Formatos JPG, PNG o WebP, hasta {MAX_IMAGE_MB} MB cada una.
                  </span>
                </p>
              </div>

              {/* Precios */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#2D1A14]/50 uppercase tracking-wide mb-1.5 block">Precio (COP) *</label>
                  <input
                    type="number"
                    value={modal.product.price ?? ""}
                    onChange={e => setField("price", e.target.value ? Number(e.target.value) : 0)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#2D1A14]/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
                    placeholder="78000"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <label className="text-xs font-semibold text-[#2D1A14]/50 uppercase tracking-wide">Antes (tachado)</label>
                    <Ayuda tema="precioAntes" />
                  </div>
                  <input
                    type="number"
                    value={modal.product.original_price ?? ""}
                    onChange={e => setField("original_price", e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#2D1A14]/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
                    placeholder="Opcional"
                  />
                </div>
              </div>

              {/* Título de la descripción (opcional) */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-xs font-semibold text-[#2D1A14]/50 uppercase tracking-wide">Título arriba de la descripción (opcional)</label>
                  <Ayuda tema="tituloDescripcion" align="left" />
                </div>
                <input
                  type="text"
                  value={modal.product.description_title || ""}
                  onChange={e => setField("description_title", e.target.value || null)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#2D1A14]/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
                  placeholder="Ej: Un aroma que abraza tu casa"
                />
              </div>

              {/* Descripción */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-xs font-semibold text-[#2D1A14]/50 uppercase tracking-wide">Descripción</label>
                  <Ayuda tema="descripcionProducto" align="left" />
                </div>
                <textarea
                  rows={3}
                  value={modal.product.description || ""}
                  onChange={e => setField("description", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#2D1A14]/15 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
                  placeholder="Describe el aroma y para qué espacios es ideal…"
                />
              </div>

              {/* Vista previa — réplica compacta de la ficha pública del producto.
                  Nada se publica hasta pulsar Guardar. */}
              <div>
                <label className="text-xs font-semibold text-[#2D1A14]/50 uppercase tracking-wide mb-1.5 block">Así se verá en la tienda</label>
                <div className="rounded-xl border border-[#2D1A14]/10 bg-[#FAF8F5] p-5 flex gap-4">
                  {modalImages[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={modalImages[0]} alt="Vista previa" className="w-24 h-24 object-contain bg-white rounded-lg flex-shrink-0" />
                  ) : (
                    <div className="w-24 h-24 rounded-lg bg-[#2D1A14]/5 flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="w-6 h-6 text-[#2D1A14]/20" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-serif text-lg text-[#2D1A14] leading-snug truncate">{modal.product.name || "Nombre del producto"}</p>
                    <p className="text-[#A67163] text-sm font-medium mt-0.5">{modal.product.price ? fmt(Number(modal.product.price)) : "$ —"}</p>
                    {modal.product.description_title && (
                      <p className="font-serif text-sm text-[#2D1A14] mt-2">{modal.product.description_title}</p>
                    )}
                    <p className="text-xs text-[#2D1A14]/55 leading-relaxed mt-1 line-clamp-3">
                      {modal.product.description || "La descripción aparecerá aquí…"}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-[#2D1A14]/40 mt-1.5">Los cambios solo se publican al pulsar “Guardar cambios”.</p>
              </div>

              {/* Stock + Activo (compacto) */}
              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <label className="text-xs font-semibold text-[#2D1A14]/50 uppercase tracking-wide">Stock</label>
                    <Ayuda tema="stock" align="left" />
                  </div>
                  <input
                    type="number"
                    value={modal.product.stock ?? ""}
                    onChange={e => setField("stock", e.target.value ? Number(e.target.value) : 0)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#2D1A14]/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
                    placeholder="50"
                  />
                </div>
                {/* El «?» va FUERA del <label>: dentro, cualquier clic sobre él
                    marcaría o desmarcaría la casilla sin querer. */}
                <div className="flex items-center gap-2 h-11">
                  <label className="flex-1 flex items-center gap-2.5 h-full px-3 rounded-xl border border-[#2D1A14]/15 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={modal.product.is_active ?? true}
                      onChange={e => setField("is_active", e.target.checked)}
                      className="w-4 h-4 accent-[#A67163]"
                    />
                    <span className="text-sm text-[#2D1A14] font-medium">Visible en tienda</span>
                  </label>
                  <Ayuda tema="visibleEnTienda" />
                </div>
              </div>

              {modalError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {modalError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  className="flex-1 h-11 rounded-xl border border-[#2D1A14]/15 text-sm font-semibold text-[#2D1A14] hover:bg-[#FAF8F5] transition-colors"
                  onClick={closeModal}
                  disabled={modalSaving || deleting}
                >
                  Cancelar
                </button>
                <button
                  className="flex-[1.4] h-11 rounded-xl bg-[#2D1A14] hover:bg-[#3D2A24] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  onClick={saveProduct}
                  disabled={modalSaving || deleting}
                >
                  {modalSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {modal.product.id ? "Guardar cambios" : "Crear producto"}
                </button>
              </div>

              {/* Eliminar producto (solo al editar) */}
              {modal.product.id && (
                <button
                  onClick={deleteProduct}
                  disabled={deleting || modalSaving}
                  className="w-full h-11 rounded-xl border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Eliminar producto de la tienda
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
