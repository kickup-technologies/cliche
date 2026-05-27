"use client"
import { useState } from "react"
import { ShoppingBag, X, RefreshCw, CheckCircle, Truck, ChevronRight } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Order, Period, filterPeriod, fmt, ORDER_STATUS_MAP } from "../types"
import { PeriodSelector } from "../components/period-selector"

type SortKey = "date" | "total" | "status"

export function PedidosSection({
  orders,
  onOrdersUpdate,
}: {
  orders: Order[]
  onOrdersUpdate: (updated: Order) => void
}) {
  const [period, setPeriod] = useState<Period>("1m")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [statusInput, setStatusInput] = useState("")
  const [trackingInput, setTrackingInput] = useState("")
  const [orderSaving, setOrderSaving] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [sortAsc, setSortAsc] = useState(false)

  const periodOrders = filterPeriod(orders, period)
  const confirmedOrders = periodOrders.filter(o => ["confirmed", "preparing", "shipped", "delivered", "paid"].includes(o.status))
  const periodRevenue = confirmedOrders.reduce((s, o) => s + o.total, 0)

  const sorted = [...periodOrders].sort((a, b) => {
    let diff = 0
    if (sortKey === "date") diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    if (sortKey === "total") diff = a.total - b.total
    if (sortKey === "status") diff = a.status.localeCompare(b.status)
    return sortAsc ? diff : -diff
  })

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  function openOrder(o: Order) {
    setSelectedOrder(o)
    setStatusInput(o.status)
    setTrackingInput(o.tracking_number || "")
  }

  async function saveOrderStatus() {
    if (!selectedOrder) return
    setOrderSaving(true)
    const update: Partial<Order> = { status: statusInput }
    if (trackingInput.trim()) update.tracking_number = trackingInput.trim()
    await supabase.from("orders").update(update).eq("id", selectedOrder.id)
    onOrdersUpdate({ ...selectedOrder, ...update })
    setSelectedOrder(null)
    setOrderSaving(false)
  }

  const SortBtn = ({ label, k }: { label: string; k: SortKey }) => (
    <button
      onClick={() => handleSort(k)}
      className={`text-xs font-semibold px-2 py-1 rounded-lg transition-colors ${sortKey === k ? "bg-[#2D1A14]/8 text-[#2D1A14]" : "text-[#2D1A14]/40 hover:text-[#2D1A14]"}`}
    >
      {label} {sortKey === k ? (sortAsc ? "▲" : "▼") : ""}
    </button>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#2D1A14]">Pedidos</h2>
          <p className="text-sm text-[#2D1A14]/50 mt-0.5">
            {periodOrders.length} pedidos · {fmt(periodRevenue)} confirmados
          </p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-[#2D1A14]/40 mr-1">Ordenar:</span>
        <SortBtn label="Fecha" k="date" />
        <SortBtn label="Total" k="total" />
        <SortBtn label="Estado" k="status" />
      </div>

      {sorted.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-12 text-center">
          <ShoppingBag className="w-10 h-10 text-[#2D1A14]/15 mx-auto mb-3" />
          <p className="text-sm text-[#2D1A14]/40">Sin pedidos en este periodo</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#2D1A14]/8 overflow-hidden">
          <div className="divide-y divide-[#2D1A14]/6">
            {sorted.map(order => {
              const st = ORDER_STATUS_MAP[order.status] || { label: order.status, color: "text-[#2D1A14]/50", bg: "bg-[#2D1A14]/5", border: "border-[#2D1A14]/10" }
              return (
                <div
                  key={order.id}
                  className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                  onClick={() => openOrder(order)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-mono text-xs text-[#2D1A14]/40">
                        #{(order.stripe_session_id || order.id).slice(-8).toUpperCase()}
                      </p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${st.bg} ${st.color} ${st.border}`}>
                        {st.label}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-[#2D1A14]">
                      {order.customer_name || order.customer_email || "—"}
                    </p>
                    <p className="text-xs text-[#2D1A14]/40 mt-0.5">
                      {order.shipping_address?.city && `${order.shipping_address.city} · `}
                      {new Date(order.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-[#2D1A14]">{fmt(order.total)}</p>
                    <p className="text-xs text-[#2D1A14]/40">{order.items?.length || 0} producto(s)</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#2D1A14]/30 flex-shrink-0" />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Order detail drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setSelectedOrder(null)}>
          <div className="flex-1 bg-black/40" />
          <div
            className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-[#2D1A14]/8 px-6 py-4 flex items-center justify-between">
              <div>
                <p className="font-mono text-xs text-[#2D1A14]/40">
                  #{(selectedOrder.stripe_session_id || selectedOrder.id).slice(-8).toUpperCase()}
                </p>
                <p className="font-semibold text-[#2D1A14]">Detalle del pedido</p>
              </div>
              <button onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-lg hover:bg-[#FAF8F5] flex items-center justify-center">
                <X className="w-4 h-4 text-[#2D1A14]/50" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Customer */}
              <div className="bg-[#FAF8F5] rounded-xl p-4 space-y-1.5">
                <p className="text-xs font-bold uppercase tracking-widest text-[#2D1A14]/40 mb-2">Cliente</p>
                <p className="text-sm text-[#2D1A14]"><span className="text-[#2D1A14]/50">Nombre:</span> {selectedOrder.customer_name || "—"}</p>
                <p className="text-sm text-[#2D1A14]"><span className="text-[#2D1A14]/50">Email:</span> {selectedOrder.customer_email || "—"}</p>
                <p className="text-sm text-[#2D1A14]"><span className="text-[#2D1A14]/50">Tel:</span> {selectedOrder.customer_phone || "—"}</p>
              </div>

              {/* Shipping */}
              {selectedOrder.shipping_address && (
                <div className="bg-[#FAF8F5] rounded-xl p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#2D1A14]/40 mb-2">Dirección de envío</p>
                  <p className="text-sm text-[#2D1A14]">{selectedOrder.shipping_address.address}</p>
                  <p className="text-sm text-[#2D1A14]">{selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.department}</p>
                  {selectedOrder.shipping_address.notes && (
                    <p className="text-xs text-[#2D1A14]/50 mt-1 italic">{selectedOrder.shipping_address.notes}</p>
                  )}
                </div>
              )}

              {/* Items */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#2D1A14]/40 mb-3">Productos</p>
                <div className="space-y-2">
                  {(selectedOrder.items || []).map((item, i) => (
                    <div key={i} className="flex items-center justify-between bg-[#FAF8F5] rounded-xl px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-[#2D1A14]">{item.name || item.product_id}</p>
                        <p className="text-xs text-[#2D1A14]/40">x {item.quantity}</p>
                      </div>
                      {item.price && <p className="text-sm font-semibold text-[#2D1A14]">{fmt(item.price * item.quantity)}</p>}
                    </div>
                  ))}
                  {selectedOrder.discount_code && (
                    <div className="flex items-center justify-between px-4 py-2 text-xs">
                      <span className="text-[#2D1A14]/50">Descuento ({selectedOrder.discount_code})</span>
                      <span className="text-red-600 font-semibold">-{fmt(selectedOrder.discount_amount || 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between px-4 py-2">
                    <span className="text-sm font-bold text-[#2D1A14]">Total</span>
                    <span className="text-sm font-bold text-[#A67163]">{fmt(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>

              {/* Update status */}
              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold uppercase tracking-widest text-[#2D1A14]/40">Actualizar estado</p>
                <select
                  value={statusInput}
                  onChange={e => setStatusInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#2D1A14]/15 bg-white text-[#2D1A14] text-sm focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
                >
                  {Object.entries(ORDER_STATUS_MAP).map(([key, st]) => (
                    <option key={key} value={key}>{st.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={trackingInput}
                  onChange={e => setTrackingInput(e.target.value)}
                  placeholder="Número de guía (opcional)"
                  className="w-full px-4 py-3 rounded-xl border border-[#2D1A14]/15 bg-white text-[#2D1A14] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
                />
                <button
                  className="w-full h-11 rounded-xl bg-[#2D1A14] hover:bg-[#3D2A24] text-white font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  onClick={saveOrderStatus}
                  disabled={orderSaving}
                >
                  {orderSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Guardar cambios
                </button>
              </div>

              {/* Tracking link */}
              <a
                href={`/pedido/${selectedOrder.stripe_session_id || selectedOrder.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-[#A67163] hover:underline"
              >
                <Truck className="w-4 h-4" />
                Ver página de seguimiento del cliente
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
