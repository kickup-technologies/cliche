"use client"
import { useState, useRef } from "react"
import { Plus, Pencil, Minus, RefreshCw, Save, X, AlertCircle, ToggleLeft, ToggleRight, Upload, ImageIcon } from "lucide-react"
import { fmt } from "../types"
import type { Product } from "@/lib/supabase"
import { adminFetch, getAdminPw } from "@/lib/admin-client"

async function uploadImage(file: File): Promise<string | null> {
  const fd = new FormData()
  fd.append("file", file)
  const res = await fetch("/api/admin/upload", {
    method: "POST",
    body: fd,
    headers: { "x-admin-password": getAdminPw() },
  })
  if (!res.ok) return null
  const { url } = await res.json()
  return url
}

function autoSlug(name: string) {
  return "aroma-" + name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

export function InventarioSection({ products, onRefresh }: { products: Product[]; onRefresh: () => Promise<void> }) {
  const [modal, setModal] = useState<{ open: boolean; product: Partial<Product> | null }>({ open: false, product: null })
  const [modalSaving, setModalSaving] = useState(false)
  const [modalError, setModalError] = useState("")
  const [uploadProgress, setUploadProgress] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function openEdit(product: Product) {
    setModalError(""); setImagePreview(null)
    setModal({ open: true, product: { ...product } })
  }
  function openNew() {
    setModalError(""); setImagePreview(null)
    setModal({ open: true, product: { name: "", slug: "", price: 78000, stock: 50, rating: 4.8, reviews: 0, is_active: true } })
  }
  function closeModal() { setModal({ open: false, product: null }); setModalError(""); setImagePreview(null) }

  function setField(key: string, value: string | number | boolean | null) {
    setModal(prev => ({ ...prev, product: { ...prev.product, [key]: value } }))
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImagePreview(URL.createObjectURL(file))
    setUploadProgress(true)
    const url = await uploadImage(file)
    setUploadProgress(false)
    if (url) {
      setField("image_url", url)
    } else {
      setModalError("Error al subir imagen")
    }
  }

  async function saveProduct() {
    if (!modal.product) return
    const p = modal.product
    if (!p.name || !p.slug || !p.price) { setModalError("Nombre, slug y precio son requeridos"); return }
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

  async function updateStock(id: string, stock: number) {
    await adminFetch(`/api/admin/products/${id}`, { method: "PUT", body: JSON.stringify({ stock }) })
    await onRefresh()
  }

  async function toggleProduct(id: string, is_active: boolean) {
    await adminFetch(`/api/admin/products/${id}`, { method: "PUT", body: JSON.stringify({ is_active }) })
    await onRefresh()
  }

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
              >
                <Pencil className="w-3.5 h-3.5 text-[#2D1A14]/50" />
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Product Modal */}
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

            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="text-xs font-semibold text-[#2D1A14]/50 uppercase tracking-wide mb-1.5 block">Nombre *</label>
                <input
                  type="text"
                  value={modal.product.name || ""}
                  onChange={e => {
                    setField("name", e.target.value)
                    if (!modal.product?.id) setField("slug", autoSlug(e.target.value))
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#2D1A14]/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
                  placeholder="Aroma Tao"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="text-xs font-semibold text-[#2D1A14]/50 uppercase tracking-wide mb-1.5 block">Slug * (URL)</label>
                <input
                  type="text"
                  value={modal.product.slug || ""}
                  onChange={e => setField("slug", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#2D1A14]/15 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
                  placeholder="aroma-tao"
                />
              </div>

              {/* Price / Stock / Rating grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "price", label: "Precio COP *", placeholder: "78000" },
                  { key: "original_price", label: "Precio original", placeholder: "90000" },
                  { key: "stock", label: "Stock", placeholder: "50" },
                  { key: "rating", label: "Rating (0-5)", placeholder: "4.8", step: "0.1" },
                ].map(({ key, label, placeholder, step }) => (
                  <div key={key}>
                    <label className="text-xs font-semibold text-[#2D1A14]/50 uppercase tracking-wide mb-1.5 block">{label}</label>
                    <input
                      type="number"
                      step={step}
                      value={(modal.product as Record<string, unknown>)[key] as number ?? ""}
                      onChange={e => setField(key, e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#2D1A14]/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
                      placeholder={placeholder}
                    />
                  </div>
                ))}
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-[#2D1A14]/50 uppercase tracking-wide mb-1.5 block">Descripción</label>
                <textarea
                  rows={3}
                  value={modal.product.description || ""}
                  onChange={e => setField("description", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#2D1A14]/15 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
                  placeholder="Describe el producto..."
                />
              </div>

              {/* Image upload */}
              <div>
                <label className="text-xs font-semibold text-[#2D1A14]/50 uppercase tracking-wide mb-1.5 block">Imagen del producto</label>
                <div className="flex items-start gap-3">
                  <div className="w-20 h-20 rounded-xl border border-[#2D1A14]/15 bg-[#FAF8F5] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {(imagePreview || modal.product.image_url) ? (
                      <img src={imagePreview || modal.product.image_url} alt="preview" className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-[#2D1A14]/20" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploadProgress}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#2D1A14]/15 text-sm text-[#2D1A14]/70 hover:bg-[#FAF8F5] transition-colors disabled:opacity-50 w-full justify-center"
                    >
                      {uploadProgress ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {uploadProgress ? "Subiendo..." : "Subir imagen"}
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <input
                      type="text"
                      value={modal.product.image_url || ""}
                      onChange={e => { setField("image_url", e.target.value); setImagePreview(null) }}
                      className="w-full px-3 py-2 rounded-xl border border-[#2D1A14]/15 bg-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
                      placeholder="O pega una URL..."
                    />
                  </div>
                </div>
              </div>

              {/* Badge */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#2D1A14]/50 uppercase tracking-wide mb-1.5 block">Badge</label>
                  <input
                    type="text"
                    value={modal.product.badge || ""}
                    onChange={e => setField("badge", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#2D1A14]/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
                    placeholder="Nuevo"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#2D1A14]/50 uppercase tracking-wide mb-1.5 block">Color badge</label>
                  <select
                    value={modal.product.badge_color || ""}
                    onChange={e => setField("badge_color", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#2D1A14]/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
                  >
                    <option value="">Sin badge</option>
                    <option value="bg-primary">Terracota</option>
                    <option value="bg-amber-500">Ambar</option>
                    <option value="bg-green-600">Verde</option>
                    <option value="bg-red-500">Rojo</option>
                  </select>
                </div>
              </div>

              {/* Active */}
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={modal.product.is_active ?? true}
                  onChange={e => setField("is_active", e.target.checked)}
                  className="w-4 h-4 accent-[#A67163]"
                />
                <label htmlFor="is_active" className="text-sm text-[#2D1A14] font-medium">Producto activo (visible en tienda)</label>
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
                  disabled={modalSaving}
                >
                  Cancelar
                </button>
                <button
                  className="flex-1 h-11 rounded-xl bg-[#2D1A14] hover:bg-[#3D2A24] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  onClick={saveProduct}
                  disabled={modalSaving}
                >
                  {modalSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {modal.product.id ? "Guardar" : "Crear"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
