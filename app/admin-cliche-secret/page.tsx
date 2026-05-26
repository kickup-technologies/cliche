"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import {
  Settings, Package, TrendingUp, ToggleLeft,
  ToggleRight, Save, Eye, RefreshCw, ShoppingBag,
  DollarSign, AlertCircle, X, Plus, Pencil
} from "lucide-react"
import type { Product } from "@/lib/supabase"

type Tab = "dashboard" | "productos" | "urgencia" | "configuracion"

interface Setting {
  key: string
  value: string
}

interface Order {
  id: string
  customer_email: string
  total: number
  status: string
  created_at: string
  items: Array<{ name: string; quantity: number; price: number }>
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("dashboard")
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  // Modal de edición / creación de producto
  const [modal, setModal] = useState<{ open: boolean; product: Partial<Product> | null }>({ open: false, product: null })
  const [modalSaving, setModalSaving] = useState(false)
  const [modalError, setModalError] = useState("")

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: prods }, { data: ords }, { data: setts }] = await Promise.all([
      supabase.from("products").select("*").order("created_at"),
      supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("site_settings").select("*"),
    ])
    setProducts(prods || [])
    setOrders(ords || [])
    const settMap: Record<string, string> = {}
    ;(setts || []).forEach((s: Setting) => { settMap[s.key] = s.value })
    setSettings(settMap)
    setLoading(false)
  }

  async function updateStock(id: string, stock: number) {
    await supabase.from("products").update({ stock }).eq("id", id)
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, stock } : p)))
  }

  async function toggleProduct(id: string, is_active: boolean) {
    await supabase.from("products").update({ is_active }).eq("id", id)
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, is_active } : p)))
  }

  async function saveSettings() {
    setSaving(true)
    const entries = Object.entries(settings)
    for (const [key, value] of entries) {
      await supabase
        .from("site_settings")
        .upsert({ key, value, updated_at: new Date().toISOString() })
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function setSetting(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  function openEdit(product: Product) {
    setModalError("")
    setModal({ open: true, product: { ...product } })
  }

  function openNew() {
    setModalError("")
    setModal({ open: true, product: { name: "", slug: "", price: 78000, stock: 50, rating: 4.8, reviews: 0, is_active: true } })
  }

  function closeModal() {
    setModal({ open: false, product: null })
    setModalError("")
  }

  function setField(key: string, value: string | number | boolean) {
    setModal((prev) => ({ ...prev, product: { ...prev.product, [key]: value } }))
  }

  function autoSlug(name: string) {
    return "aroma-" + name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  }

  async function saveProduct() {
    if (!modal.product) return
    const p = modal.product
    if (!p.name || !p.slug || !p.price) { setModalError("Nombre, slug y precio son requeridos"); return }
    setModalSaving(true)
    setModalError("")
    try {
      if (p.id) {
        const { error } = await supabase.from("products").update({ ...p, updated_at: new Date().toISOString() }).eq("id", p.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("products").insert({ ...p })
        if (error) throw error
      }
      await loadAll()
      closeModal()
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setModalSaving(false)
    }
  }

  const totalRevenue = orders
    .filter((o) => o.status === "paid")
    .reduce((acc, o) => acc + (o.total || 0), 0)

  const totalOrders = orders.filter((o) => o.status === "paid").length

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted-foreground">Cargando panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <div className="bg-background border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <div>
              <h1 className="font-serif font-bold text-foreground">Panel Admin</h1>
              <p className="text-xs text-muted-foreground">Bienestar by Cliché</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadAll}>
              <RefreshCw className="w-3 h-3 mr-1" /> Actualizar
            </Button>
            <Button size="sm" asChild>
              <a href="/" target="_blank"><Eye className="w-3 h-3 mr-1" /> Ver tienda</a>
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {([
              { id: "dashboard", label: "Dashboard", icon: TrendingUp },
              { id: "productos", label: "Productos", icon: Package },
              { id: "urgencia", label: "Urgencia", icon: AlertCircle },
              { id: "configuracion", label: "Config", icon: Settings },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && (
          <div className="space-y-8">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Ingresos totales", value: `$${(totalRevenue / 100).toLocaleString("es-CO")} COP`, icon: DollarSign, color: "text-green-600" },
                { label: "Pedidos pagados", value: totalOrders, icon: ShoppingBag, color: "text-blue-600" },
                { label: "Productos activos", value: products.filter((p) => p.is_active).length, icon: Package, color: "text-primary" },
                { label: "Stock bajo (≤3)", value: products.filter((p) => p.stock <= 3).length, icon: AlertCircle, color: "text-red-500" },
              ].map((stat) => (
                <div key={stat.label} className="bg-background rounded-2xl border border-border p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Recent orders */}
            <div className="bg-background rounded-2xl border border-border overflow-hidden">
              <div className="p-5 border-b border-border">
                <h2 className="font-semibold text-foreground">Pedidos recientes</h2>
              </div>
              <div className="divide-y divide-border">
                {orders.length === 0 ? (
                  <p className="p-6 text-center text-muted-foreground text-sm">Sin pedidos aún</p>
                ) : (
                  orders.slice(0, 10).map((order) => (
                    <div key={order.id} className="p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">
                          {order.customer_email || "Sin email"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          #{order.id.slice(0, 8).toUpperCase()} · {new Date(order.created_at).toLocaleDateString("es-CO")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <p className="font-bold text-sm text-foreground">
                          ${((order.total || 0) / 100).toLocaleString("es-CO")}
                        </p>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          order.status === "paid" ? "bg-green-100 text-green-700" :
                          order.status === "shipped" ? "bg-blue-100 text-blue-700" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── PRODUCTOS ── */}
        {tab === "productos" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-serif text-xl font-bold text-foreground">Inventario</h2>
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">{products.length} productos</p>
                <Button size="sm" onClick={openNew} className="rounded-full h-8 gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Nuevo producto
                </Button>
              </div>
            </div>
            {products.map((product) => (
              <div key={product.id} className="bg-background rounded-2xl border border-border p-4">
                <div className="flex items-center gap-4">
                  <img
                    src={product.image_url || "/placeholder-product.jpg"}
                    alt={product.name}
                    className="w-14 h-14 object-contain rounded-xl bg-muted/30 p-1 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ${product.price.toLocaleString("es-CO")} COP · {product.rating} ({product.reviews} reseñas)
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Stock control */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateStock(product.id, Math.max(0, product.stock - 1))}
                        className="w-7 h-7 rounded-lg border border-border hover:bg-muted flex items-center justify-center text-sm font-bold"
                      >
                        −
                      </button>
                      <span className={`w-8 text-center font-bold text-sm ${product.stock <= 3 ? "text-red-500" : "text-foreground"}`}>
                        {product.stock}
                      </span>
                      <button
                        onClick={() => updateStock(product.id, product.stock + 1)}
                        className="w-7 h-7 rounded-lg border border-border hover:bg-muted flex items-center justify-center text-sm font-bold"
                      >
                        +
                      </button>
                    </div>

                    {/* Active toggle */}
                    <button
                      onClick={() => toggleProduct(product.id, !product.is_active)}
                      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                        product.is_active
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {product.is_active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                      {product.is_active ? "Activo" : "Oculto"}
                    </button>
                    {/* Editar */}
                    <button
                      onClick={() => openEdit(product)}
                      className="w-8 h-8 rounded-lg border border-border hover:bg-muted flex items-center justify-center transition-colors"
                      title="Editar producto"
                    >
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── URGENCIA ── */}
        {tab === "urgencia" && (
          <div className="space-y-6 max-w-2xl">
            <h2 className="font-serif text-xl font-bold text-foreground">Efectos de Urgencia y Escasez</h2>
            <p className="text-sm text-muted-foreground">Activa o desactiva cada efecto para influir en las decisiones de compra.</p>

            {[
              { key: "urgency_bar_enabled", label: "Barra de urgencia", desc: "Barra top con cuenta regresiva o mensaje de prisa" },
              { key: "countdown_enabled", label: "Contador de tiempo", desc: "Timer en productos con oferta limitada" },
              { key: "stock_badge_enabled", label: "Badges de stock bajo", desc: "Muestra '¡Solo X disponibles!' cuando stock ≤ 5" },
              { key: "social_proof_enabled", label: "Notificaciones sociales", desc: "Toasts tipo 'Alguien en Bogotá compró hace 2h'" },
            ].map(({ key, label, desc }) => (
              <div key={key} className="bg-background rounded-2xl border border-border p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-sm text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
                <button
                  onClick={() => setSetting(key, settings[key] === "true" ? "false" : "true")}
                  className={`flex-shrink-0 w-12 h-6 rounded-full transition-colors ${
                    settings[key] === "true" ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${
                    settings[key] === "true" ? "translate-x-6" : "translate-x-0"
                  }`} />
                </button>
              </div>
            ))}

            <Button onClick={saveSettings} disabled={saving} className="w-full h-12 rounded-xl">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              {saved ? "¡Guardado!" : "Guardar cambios"}
            </Button>
          </div>
        )}

        {/* ── CONFIGURACION ── */}
        {tab === "configuracion" && (
          <div className="space-y-6 max-w-2xl">
            <h2 className="font-serif text-xl font-bold text-foreground">Configuración General</h2>

            {[
              { key: "announcement_text", label: "Texto del anuncio (barra top)", type: "text" },
              { key: "free_shipping_threshold", label: "Umbral envío gratis (COP)", type: "number" },
              { key: "whatsapp_number", label: "Número WhatsApp (ej: 573194565463)", type: "text" },
              { key: "whatsapp_message", label: "Mensaje predeterminado WhatsApp", type: "text" },
            ].map(({ key, label, type }) => (
              <div key={key} className="space-y-2">
                <label className="text-sm font-medium text-foreground">{label}</label>
                <input
                  type={type}
                  value={settings[key] || ""}
                  onChange={(e) => setSetting(key, e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            ))}

            <Button onClick={saveSettings} disabled={saving} className="w-full h-12 rounded-xl">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              {saved ? "¡Guardado!" : "Guardar configuración"}
            </Button>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mt-6">
              <p className="text-amber-800 text-sm font-semibold">Acceso privado</p>
              <p className="text-amber-700 text-xs mt-1">
                Esta URL es secreta. No la compartas públicamente. Solo accede desde un dispositivo de confianza.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL EDITAR / CREAR PRODUCTO ── */}
      {modal.open && modal.product && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-background rounded-2xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="font-serif font-bold text-foreground">
                {modal.product.id ? "Editar producto" : "Nuevo producto"}
              </h3>
              <button onClick={closeModal} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">
              {/* Nombre */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Nombre *</label>
                <input
                  type="text"
                  value={modal.product.name || ""}
                  onChange={(e) => {
                    setField("name", e.target.value)
                    if (!modal.product?.id) setField("slug", autoSlug(e.target.value))
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Aroma Tao"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Slug * (URL)</label>
                <input
                  type="text"
                  value={modal.product.slug || ""}
                  onChange={(e) => setField("slug", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="aroma-tao"
                />
              </div>

              {/* Precio y Precio original */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Precio COP *</label>
                  <input
                    type="number"
                    value={modal.product.price || ""}
                    onChange={(e) => setField("price", Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="78000"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Precio original</label>
                  <input
                    type="number"
                    value={modal.product.original_price || ""}
                    onChange={(e) => setField("original_price", e.target.value ? Number(e.target.value) : null as unknown as number)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="90000"
                  />
                </div>
              </div>

              {/* Stock y Rating */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Stock</label>
                  <input
                    type="number"
                    value={modal.product.stock ?? 50}
                    onChange={(e) => setField("stock", Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Rating (0-5)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={modal.product.rating ?? 4.8}
                    onChange={(e) => setField("rating", Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Descripción</label>
                <textarea
                  rows={4}
                  value={modal.product.description || ""}
                  onChange={(e) => setField("description", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Describe el producto y su propuesta de valor..."
                />
              </div>

              {/* URL imagen */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">URL de imagen</label>
                <input
                  type="text"
                  value={modal.product.image_url || ""}
                  onChange={(e) => setField("image_url", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="https://cdn.shopify.com/..."
                />
                {modal.product.image_url?.startsWith("http") && (
                  <img src={modal.product.image_url} alt="preview" className="mt-2 w-16 h-16 object-cover rounded-lg border border-border" />
                )}
              </div>

              {/* Badge y color */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Badge</label>
                  <input
                    type="text"
                    value={modal.product.badge || ""}
                    onChange={(e) => setField("badge", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="Nuevo"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Color badge</label>
                  <select
                    value={modal.product.badge_color || ""}
                    onChange={(e) => setField("badge_color", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="">Sin badge</option>
                    <option value="bg-primary">Terracota (principal)</option>
                    <option value="bg-amber-500">Ámbar</option>
                    <option value="bg-green-600">Verde</option>
                    <option value="bg-red-500">Rojo</option>
                    <option value="bg-gray-400">Gris</option>
                  </select>
                </div>
              </div>

              {/* Activo */}
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={modal.product.is_active ?? true}
                  onChange={(e) => setField("is_active", e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <label htmlFor="is_active" className="text-sm text-foreground font-medium">Producto activo (visible en tienda)</label>
              </div>

              {/* Error */}
              {modalError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">{modalError}</p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={closeModal} disabled={modalSaving}>
                  Cancelar
                </Button>
                <Button className="flex-1 rounded-xl" onClick={saveProduct} disabled={modalSaving}>
                  {modalSaving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  {modal.product.id ? "Guardar cambios" : "Crear producto"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
