"use client"
import { useState, useRef } from "react"
import { Plus, Pencil, Minus, RefreshCw, Save, X, AlertCircle, ToggleLeft, ToggleRight, Upload, ImageIcon, Trash2 } from "lucide-react"
import { fmt } from "../types"
import type { Product } from "@/lib/supabase"
import { adminFetch } from "@/lib/admin-client"

// Categorías (familias olfativas) que el admin asigna al producto. Deben
// coincidir con las del catálogo (app/catalogo/page.tsx → FAMILIES).
const CATEGORIES = [
  { value: "citricos", label: "Cítricos" },
  { value: "florales", label: "Florales" },
  { value: "amaderados", label: "Amaderados" },
  { value: "dulces", label: "Dulces" },
  { value: "frescos", label: "Frescos" },
] as const

async function uploadImage(file: File): Promise<string | null> {
  const fd = new FormData()
  fd.append("file", file)
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd })
  if (!res.ok) return null
  const { url } = await res.json()
  return url
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
    for (const f of files) {
      const url = await uploadImage(f)
      if (url) uploaded.push(url)
    }
    setUploadProgress(false)
    if (fileRef.current) fileRef.current.value = ""
    if (!uploaded.length) { setModalError("No se pudo subir la imagen"); return }
    const all = [...imagesOf(modal.product), ...uploaded]
    setModal(prev => ({ ...prev, product: { ...prev.product, image_urls: all, image_url: all[0] } }))
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

  async function updateStock(id: string, stock: number) {
    await adminFetch(`/api/admin/products/${id}`, { method: "PUT", body: JSON.stringify({ stock }) })
    await onRefresh()
  }

  async function toggleProduct(id: string, is_active: boolean) {
    await adminFetch(`/api/admin/products/${id}`, { method: "PUT", body: JSON.stringify({ is_active }) })
    await onRefresh()
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

      {products.map(product => (
        <div key={product.id} className="bg-white rounded-2xl border border-[#2D1A14]/8 p-4">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.image_url || "/placeholder-product.jpg"}
              alt={product.name}
              className="w-14 h-14 object-contain rounded-xl bg-[#FAF8F5] p-1 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-[#2D1A14] truncate">{product.name}</p>
              <p className="text-sm text-[#2D1A14]/60 mt-0.5">{fmt(product.price)}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
              <button
                onClick={() => updateStock(product.id, Math.max(0, product.stock - 1))}
                className="w-7 h-7 rounded-lg border border-[#2D1A14]/15 hover:bg-[#FAF8F5] flex items-center justify-center"
              >
                <Minus className="w-3 h-3 text-[#2D1A14]" />
              </button>
              <span className={`w-8 text-center font-bold text-sm ${product.stock <= 5 ? "text-red-500" : "text-[#2D1A14]"}`}>
                {product.stock}
              </span>
              <button
                onClick={() => updateStock(product.id, product.stock + 1)}
                className="w-7 h-7 rounded-lg border border-[#2D1A14]/15 hover:bg-[#FAF8F5] flex items-center justify-center"
              >
                <Plus className="w-3 h-3 text-[#2D1A14]" />
              </button>
              <button
                onClick={() => toggleProduct(product.id, !product.is_active)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${product.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-[#2D1A14]/5 text-[#2D1A14]/40 border-[#2D1A14]/10"}`}
              >
                {product.is_active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                {product.is_active ? "Activo" : "Oculto"}
              </button>
              <button
                onClick={() => openEdit(product)}
                className="w-8 h-8 rounded-lg border border-[#2D1A14]/15 hover:bg-[#FAF8F5] flex items-center justify-center transition-colors"
                title="Editar"
              >
                <Pencil className="w-3.5 h-3.5 text-[#2D1A14]/50" />
              </button>
            </div>
          </div>
        </div>
      ))}

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
                <label className="text-xs font-semibold text-[#2D1A14]/50 uppercase tracking-wide mb-1.5 block">Título del producto *</label>
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
                <label className="text-xs font-semibold text-[#2D1A14]/50 uppercase tracking-wide mb-1.5 block">Imágenes de referencia</label>
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
                  accept="image/*"
                  multiple
                  onChange={handleFilesChange}
                  className="hidden"
                />
                {modalImages.length === 0 && (
                  <p className="text-[11px] text-[#2D1A14]/40 mt-2 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" /> Sube una o varias fotos. La primera será la principal.
                  </p>
                )}
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
                  <label className="text-xs font-semibold text-[#2D1A14]/50 uppercase tracking-wide mb-1.5 block">Antes (tachado)</label>
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
                <label className="text-xs font-semibold text-[#2D1A14]/50 uppercase tracking-wide mb-1.5 block">Título arriba de la descripción (opcional)</label>
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
                <label className="text-xs font-semibold text-[#2D1A14]/50 uppercase tracking-wide mb-1.5 block">Descripción</label>
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
                  <label className="text-xs font-semibold text-[#2D1A14]/50 uppercase tracking-wide mb-1.5 block">Stock</label>
                  <input
                    type="number"
                    value={modal.product.stock ?? ""}
                    onChange={e => setField("stock", e.target.value ? Number(e.target.value) : 0)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#2D1A14]/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
                    placeholder="50"
                  />
                </div>
                <label className="flex items-center gap-2.5 h-11 px-3 rounded-xl border border-[#2D1A14]/15 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modal.product.is_active ?? true}
                    onChange={e => setField("is_active", e.target.checked)}
                    className="w-4 h-4 accent-[#A67163]"
                  />
                  <span className="text-sm text-[#2D1A14] font-medium">Visible en tienda</span>
                </label>
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
