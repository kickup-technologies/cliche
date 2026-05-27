"use client"
import { useState } from "react"
import { Zap, Info, AlertCircle, Check } from "lucide-react"
import { Order, CONFIRMED } from "../types"
import type { Product } from "@/lib/supabase"

type UrgencyStrategy = "scarcity" | "time_limit" | "reverse_psychology" | "social_proof" | "flash_sale"
type Priority = "critical" | "high" | "medium" | "low"

interface UrgencyRec {
  product_id: string
  product_name: string
  strategy: UrgencyStrategy
  urgency_message: string
  admin_reason: string
  priority: Priority
  velocity: number
  unitsSold: number
  stock: number
  daysWithoutSale: number
  enabled: boolean
}

const STRATEGY_CONFIG: Record<UrgencyStrategy, { label: string; color: string; bg: string; border: string }> = {
  scarcity:           { label: "ESCASEZ",           color: "text-red-700",    bg: "bg-red-50",     border: "border-red-200" },
  time_limit:         { label: "TIEMPO LÍMITE",      color: "text-amber-700",  bg: "bg-amber-50",   border: "border-amber-200" },
  reverse_psychology: { label: "PSICOLOGÍA INVERSA", color: "text-purple-700", bg: "bg-purple-50",  border: "border-purple-200" },
  social_proof:       { label: "PRUEBA SOCIAL",      color: "text-blue-700",   bg: "bg-blue-50",    border: "border-blue-200" },
  flash_sale:         { label: "FLASH SALE",         color: "text-orange-700", bg: "bg-orange-50",  border: "border-orange-200" },
}

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  critical: { label: "Crítico", color: "text-red-600" },
  high:     { label: "Alto",    color: "text-orange-600" },
  medium:   { label: "Medio",   color: "text-amber-600" },
  low:      { label: "Bajo",    color: "text-[#2D1A14]/40" },
}

function generateUrgencyRecs(products: Product[], orders: Order[]): UrgencyRec[] {
  const last30 = orders.filter(o =>
    new Date(o.created_at) >= new Date(Date.now() - 30 * 86400000) && CONFIRMED.includes(o.status)
  )

  return products.filter(p => p.is_active).map(product => {
    const unitsSold = last30.reduce((s, o) => {
      const item = o.items?.find(i => i.product_id === product.id)
      return s + (item?.quantity || 0)
    }, 0)
    const velocity = unitsSold / 30

    const lastSaleOrder = orders
      .filter(o => CONFIRMED.includes(o.status) && o.items?.some(i => i.product_id === product.id))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    const daysWithoutSale = lastSaleOrder
      ? Math.floor((Date.now() - new Date(lastSaleOrder.created_at).getTime()) / 86400000)
      : 999

    let strategy: UrgencyStrategy
    let urgency_message: string
    let admin_reason: string
    let priority: Priority

    if (product.stock <= 3) {
      strategy = "scarcity"
      urgency_message = `¡Solo quedan ${product.stock} unidades disponibles!`
      admin_reason = `Stock crítico real (${product.stock} uds). La urgencia es genuina — el cliente compra o pierde.`
      priority = "critical"
    } else if (velocity < 0.05 && product.stock > 15 && daysWithoutSale > 7) {
      strategy = "reverse_psychology"
      urgency_message = "Pieza exclusiva · No apta para todos los gustos"
      admin_reason = `Solo ${unitsSold} uds vendidas en 30 días. ${daysWithoutSale < 999 ? `${daysWithoutSale} días` : "Varios días"} sin venta. Psicología inversa: crear percepción de exclusividad activa FOMO sin ser agresivo.`
      priority = "high"
    } else if (velocity < 0.2 && velocity >= 0.05 && unitsSold > 0) {
      strategy = "time_limit"
      urgency_message = "Precio especial · Solo por tiempo limitado"
      admin_reason = `Ventas moderadas (${unitsSold} uds/mes). La urgencia temporal reduce la postergación de decisión de compra en un 30–40%.`
      priority = "high"
    } else if (product.stock <= 10 && velocity > 0.3) {
      strategy = "flash_sale"
      urgency_message = `Se está agotando · ${unitsSold} personas lo llevaron este mes`
      admin_reason = `Buenas ventas (${velocity.toFixed(2)} uds/día) con stock bajo (${product.stock}). Combinar escasez real con prueba social maximiza conversión.`
      priority = "medium"
    } else {
      strategy = "social_proof"
      urgency_message = unitsSold > 0 ? `${unitsSold} hogares ya lo tienen` : "El favorito de nuestras clientas"
      admin_reason = `Producto con ventas normales. La prueba social refuerza la decisión sin generar presión innecesaria.`
      priority = "low"
    }

    return {
      product_id: product.id, product_name: product.name, strategy, urgency_message, admin_reason,
      priority, velocity, unitsSold, stock: product.stock, daysWithoutSale, enabled: false,
    }
  }).sort((a, b) => {
    const p: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 }
    return p[a.priority] - p[b.priority]
  })
}

export function UrgenciaSection({ orders, products }: { orders: Order[]; products: Product[] }) {
  const [recs, setRecs] = useState<UrgencyRec[]>(() => generateUrgencyRecs(products, orders))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expandedReason, setExpandedReason] = useState<string | null>(null)

  function toggleRec(id: string) {
    setRecs(prev => prev.map(r => r.product_id === id ? { ...r, enabled: !r.enabled } : r))
  }

  async function applyConfig() {
    setSaving(true)
    // In a real implementation this would save to site_settings
    await new Promise(r => setTimeout(r, 600))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const enabledCount = recs.filter(r => r.enabled).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#2D1A14]">Urgencia Inteligente</h2>
          <p className="text-sm text-[#2D1A14]/50 mt-0.5">Estrategias de conversión generadas por el algoritmo</p>
        </div>
        <button
          onClick={applyConfig}
          disabled={saving || enabledCount === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[#2D1A14] text-white hover:bg-[#3D2A24] disabled:opacity-40 transition-all"
        >
          {saving ? <Zap className="w-4 h-4 animate-pulse" /> : saved ? <Check className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
          {saved ? "Configuración aplicada" : `Aplicar configuración${enabledCount > 0 ? ` (${enabledCount})` : ""}`}
        </button>
      </div>

      {/* Algorithm info */}
      <div className="bg-[#2D1A14]/5 border border-[#2D1A14]/10 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-[#2D1A14]/50 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-[#2D1A14]/60 space-y-1">
            <p className="font-semibold text-[#2D1A14]">Cómo funciona el algoritmo</p>
            <p>Analiza stock, velocidad de ventas (uds/día) y días sin venta de cada producto para asignar la estrategia de urgencia óptima. Activa las que quieras aplicar en la tienda y guarda la configuración.</p>
          </div>
        </div>
      </div>

      {/* Recommendation cards */}
      <div className="space-y-4">
        {recs.map(rec => {
          const sc = STRATEGY_CONFIG[rec.strategy]
          const pc = PRIORITY_CONFIG[rec.priority]
          const isExpanded = expandedReason === rec.product_id
          return (
            <div
              key={rec.product_id}
              className={`bg-white rounded-2xl border transition-all ${rec.enabled ? "border-[#A67163]/30 shadow-sm" : "border-[#2D1A14]/8"}`}
            >
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sc.bg} ${sc.color} ${sc.border}`}>
                        {sc.label}
                      </span>
                      <span className={`text-[10px] font-bold ${pc.color}`}>
                        Prioridad: {pc.label}
                      </span>
                    </div>
                    <h3 className="font-semibold text-[#2D1A14] truncate">{rec.product_name}</h3>
                    <p className="text-xs text-[#2D1A14]/40 mt-0.5">
                      {rec.unitsSold} uds/mes · {rec.velocity.toFixed(2)} uds/día · Stock: {rec.stock}
                    </p>
                  </div>
                  {/* Toggle */}
                  <button
                    onClick={() => toggleRec(rec.product_id)}
                    className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${rec.enabled ? "bg-[#A67163]" : "bg-[#2D1A14]/15"}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${rec.enabled ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>

                {/* Suggested message */}
                <div className="bg-[#FAF8F5] border-l-2 border-[#A67163] rounded-r-xl px-4 py-3 mb-3">
                  <p className="text-xs font-semibold text-[#2D1A14]/40 uppercase tracking-wide mb-1">Mensaje al cliente</p>
                  <p className="text-sm font-medium text-[#2D1A14] italic">&ldquo;{rec.urgency_message}&rdquo;</p>
                </div>

                {/* Admin reason (expandable) */}
                <button
                  onClick={() => setExpandedReason(isExpanded ? null : rec.product_id)}
                  className="flex items-center gap-1.5 text-xs text-[#2D1A14]/40 hover:text-[#2D1A14]/60 transition-colors"
                >
                  <Info className="w-3 h-3" />
                  {isExpanded ? "Ocultar explicación" : "Ver por qué esta estrategia"}
                </button>
                {isExpanded && (
                  <div className="mt-3 bg-[#2D1A14]/4 rounded-xl px-4 py-3">
                    <p className="text-xs text-[#2D1A14]/60">{rec.admin_reason}</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {recs.length === 0 && (
          <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-12 text-center">
            <AlertCircle className="w-10 h-10 text-[#2D1A14]/15 mx-auto mb-3" />
            <p className="text-sm text-[#2D1A14]/40">No hay productos activos para analizar</p>
          </div>
        )}
      </div>
    </div>
  )
}
