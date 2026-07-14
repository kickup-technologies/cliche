"use client"
import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import { ShoppingBag, X, RefreshCw, CheckCircle, Truck, ChevronRight, Search, Download, Hourglass, Printer } from "lucide-react"
import { Order, Period, filterPeriod, fmt, ORDER_STATUS_MAP } from "../types"
import { PeriodSelector } from "../components/period-selector"
import { adminFetch } from "@/lib/admin-client"
import type { Product } from "@/lib/supabase"

type SortKey = "date" | "total" | "status"
type Vista = "pagados" | "intentos"

// Un pago tal como lo devuelve /api/admin/orders/diagnose (resumen de MP).
interface PagoMP {
  id: number
  fecha: string | null
  estado: string | null
  detalle: string | null
  metodo: string | null
  monto: number | null
}

// Traducción de los códigos de Mercado Pago al español de la operadora: sin
// esto el drawer mostraría "cc_rejected_high_risk" y nadie sabría qué decirle
// al cliente que pregunta por qué no pasó su tarjeta.
const MP_ESTADO_ES: Record<string, string> = {
  approved: "Aprobado",
  rejected: "Rechazado",
  pending: "Pendiente",
  in_process: "En proceso",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
  charged_back: "Contracargo",
}

const MP_DETALLE_ES: Record<string, string> = {
  cc_rejected_high_risk: "Rechazada por el antifraude de Mercado Pago",
  cc_rejected_call_for_authorize: "El banco pide autorizar la compra por teléfono",
  cc_rejected_insufficient_amount: "Fondos insuficientes",
  cc_rejected_other_reason: "El banco rechazó el pago sin dar más detalle",
  cc_rejected_card_disabled: "Tarjeta inactiva: el cliente debe habilitarla con su banco",
  cc_rejected_duplicated_payment: "Pago duplicado: ya hay un pago reciente por el mismo monto",
  cc_rejected_max_attempts: "Superó el número de intentos permitidos",
  cc_rejected_blacklist: "Tarjeta bloqueada por Mercado Pago",
  cc_rejected_card_error: "Error al procesar la tarjeta",
  cc_rejected_invalid_installments: "El banco no acepta ese número de cuotas",
  pending_contingency: "Mercado Pago sigue procesando el pago",
  pending_waiting_payment: "Esperando que el cliente pague (efectivo/PSE)",
  pending_waiting_transfer: "Esperando la transferencia del cliente",
  expired: "El intento de pago expiró",
  accredited: "Pago aprobado y acreditado",
}

function detalleMP(detalle: string | null | undefined): string {
  if (!detalle) return "Sin detalle del banco"
  if (MP_DETALLE_ES[detalle]) return MP_DETALLE_ES[detalle]
  // Toda la familia cc_rejected_bad_filled_* significa lo mismo para la dueña.
  if (detalle.startsWith("cc_rejected_bad_filled")) return "Datos de la tarjeta mal digitados"
  return `Código de Mercado Pago: ${detalle}`
}

// Resumen "producto x cantidad" en una sola celda/línea. Los kits despliegan
// sus componentes para que quien empaca sepa exactamente qué frascos van.
function itemsResumen(o: Order): string {
  return (o.items || [])
    .map(i => {
      const base = `${i.name || i.product_id || "?"} x${i.quantity}`
      const comps = i.components && i.components.length > 0
        ? ` (${i.components.map(c => `${c.name} x${c.quantity}`).join(", ")})`
        : ""
      return base + comps
    })
    .join(" | ")
}

export function PedidosSection({
  orders,
  products = [],
  onOrdersUpdate,
}: {
  orders: Order[]
  products?: Product[]
  onOrdersUpdate: (updated: Order) => void
}) {
  const [period, setPeriod] = useState<Period>("1m")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [statusInput, setStatusInput] = useState("")
  const [trackingInput, setTrackingInput] = useState("")
  const [orderSaving, setOrderSaving] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [sortAsc, setSortAsc] = useState(false)
  const [query, setQuery] = useState("")

  // Vista principal: SOLO pedidos pagados. La secundaria ("intentos") muestra
  // los checkouts que nunca completaron el pago — informativa, se carga aparte.
  const [vista, setVista] = useState<Vista>("pagados")
  const [intentos, setIntentos] = useState<Order[] | null>(null)
  const [intentosLoading, setIntentosLoading] = useState(false)
  const [reconciling, setReconciling] = useState(false)
  useEffect(() => {
    if (vista !== "intentos" || intentos !== null) return
    setIntentosLoading(true)
    adminFetch("/api/admin/orders?vista=intentos")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: Order[]) => setIntentos(Array.isArray(d) ? d : []))
      .catch(() => setIntentos([]))
      .finally(() => setIntentosLoading(false))
  }, [vista, intentos])

  // Motivo de rechazo: al abrir un intento sin pagar se consultan on-demand
  // sus pagos en Mercado Pago (vía diagnose?reference=X) para mostrar POR QUÉ
  // no se completó (antifraude, fondos, datos mal digitados, etc.).
  const [pagosIntento, setPagosIntento] = useState<PagoMP[] | null>(null)
  const [pagosLoading, setPagosLoading] = useState(false)
  useEffect(() => {
    if (!selectedOrder || selectedOrder.status !== "pending") { setPagosIntento(null); return }
    const ref = selectedOrder.stripe_session_id
    if (!ref) { setPagosIntento([]); return }
    let cancelled = false
    setPagosIntento(null)
    setPagosLoading(true)
    adminFetch(`/api/admin/orders/diagnose?reference=${encodeURIComponent(ref)}`)
      .then((r) => (r.ok ? r.json() : { pagos: [] }))
      .then((d: { pagos?: PagoMP[] }) => { if (!cancelled) setPagosIntento(Array.isArray(d.pagos) ? d.pagos : []) })
      .catch(() => { if (!cancelled) setPagosIntento([]) })
      .finally(() => { if (!cancelled) setPagosLoading(false) })
    return () => { cancelled = true }
  }, [selectedOrder])

  // Imagen de cada producto del catálogo, para mostrarla en el ticket.
  const productImg = useMemo(() => {
    const map: Record<string, string> = {}
    for (const p of products) {
      const img = p.image_url || p.image_urls?.[0]
      if (img) map[p.id] = img
    }
    return map
  }, [products])

  const sourceOrders = vista === "pagados" ? orders : (intentos ?? [])
  const periodOrders = filterPeriod(sourceOrders, period)
  const confirmedOrders = periodOrders.filter(o => ["confirmed", "preparing", "shipped", "delivered", "paid"].includes(o.status))
  const periodRevenue = confirmedOrders.reduce((s, o) => s + o.total, 0)
  // El header dice "N pedidos pagados": los cancelados siguen en la lista
  // (para consultarlos) pero no deben inflar ese conteo.
  const paidCount = periodOrders.filter(o => o.status !== "cancelled").length

  const q = query.trim().toLowerCase()
  const filtered = q
    ? periodOrders.filter(o =>
        (o.customer_name || "").toLowerCase().includes(q) ||
        (o.customer_email || "").toLowerCase().includes(q) ||
        (o.customer_phone || "").toLowerCase().includes(q) ||
        (o.stripe_session_id || o.id).toLowerCase().includes(q)
      )
    : periodOrders

  function exportCSV() {
    // Columnas pensadas para generar guías de envío (Servientrega, Coordinadora,
    // Interrapidísimo exigen dirección completa + departamento + cédula del
    // destinatario) y para empacar sin abrir pedido por pedido ("Productos").
    const headers = ["Pedido", "Estado", "Cliente", "Cedula", "Email", "Telefono", "Direccion", "Ciudad", "Departamento", "Notas", "Productos", "Total", "Guia", "Fecha"]
    const rows = filtered.map(o => [
      "#" + (o.stripe_session_id || o.id).slice(-8).toUpperCase(),
      ORDER_STATUS_MAP[o.status]?.label || o.status,
      o.customer_name || "",
      o.customer_id_number || "",
      o.customer_email || "",
      o.customer_phone || "",
      o.shipping_address?.address || "",
      o.shipping_address?.city || "",
      o.shipping_address?.department || "",
      o.shipping_address?.notes || "",
      itemsResumen(o),
      o.total,
      o.tracking_number || "",
      new Date(o.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota" }),
    ])
    const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    const csv = [headers, ...rows].map(r => r.map(escape).join(",")).join("\r\n")
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const sorted = [...filtered].sort((a, b) => {
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
    try {
      const res = await adminFetch("/api/admin/orders", {
        method: "PATCH",
        body: JSON.stringify({ id: selectedOrder.id, ...update }),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "" }))
        alert(error || "No se pudo actualizar el pedido")
        return
      }
      onOrdersUpdate({ ...selectedOrder, ...update })
      setSelectedOrder(null)
    } finally {
      setOrderSaving(false)
    }
  }

  // Reconciliar pagos: pregunta a Mercado Pago por cada pedido "pending" y
  // confirma los que en realidad SÍ se pagaron (red de seguridad del webhook).
  async function reconcilePayments() {
    if (reconciling) return
    setReconciling(true)
    try {
      const res = await adminFetch("/api/admin/orders/reconcile", { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data.error || "No se pudo reconciliar. Revisa que MERCADOPAGO_ACCESS_TOKEN esté configurado.")
        return
      }
      if (data.confirmed > 0) {
        alert(`Se recuperaron ${data.confirmed} pago(s) que no se habían registrado. Actualizando…`)
        window.location.reload()
      } else {
        alert(`Revisados ${data.checked} intento(s): ninguno tenía un pago aprobado en Mercado Pago. Todo al día.`)
      }
    } finally {
      setReconciling(false)
    }
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
            {vista === "pagados"
              ? `${paidCount} pedidos pagados · ${fmt(periodRevenue)} confirmados`
              : `${periodOrders.length} intentos de pago sin completar (nunca se cobraron)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodSelector value={period} onChange={setPeriod} />
          <button
            onClick={reconcilePayments}
            disabled={reconciling}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-[#A67163]/40 text-xs font-semibold text-[#A67163] hover:bg-[#A67163]/8 transition-colors disabled:opacity-40"
            title="Consulta Mercado Pago y confirma pedidos que se pagaron pero quedaron como intento sin pagar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reconciling ? "animate-spin" : ""}`} />
            {reconciling ? "Reconciliando…" : "Reconciliar pagos"}
          </button>
          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-[#2D1A14]/15 text-xs font-semibold text-[#2D1A14] hover:bg-[#FAF8F5] transition-colors disabled:opacity-40"
            title="Exportar a CSV (Excel)"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#2D1A14]/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por nombre, email, teléfono o # de pedido…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#2D1A14]/15 bg-white text-[#2D1A14] text-sm focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2D1A14]/30 hover:text-[#2D1A14]">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Sort controls + vista secundaria */}
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-xs text-[#2D1A14]/40 mr-1">Ordenar:</span>
        <SortBtn label="Fecha" k="date" />
        <SortBtn label="Total" k="total" />
        <SortBtn label="Estado" k="status" />
        <span className="mx-2 h-4 w-px bg-[#2D1A14]/10" />
        <button
          onClick={() => setVista("pagados")}
          className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${vista === "pagados" ? "bg-[#2D1A14] text-white" : "text-[#2D1A14]/40 hover:text-[#2D1A14]"}`}
        >
          Pagados
        </button>
        <button
          onClick={() => setVista("intentos")}
          className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${vista === "intentos" ? "bg-[#2D1A14] text-white" : "text-[#2D1A14]/40 hover:text-[#2D1A14]"}`}
          title="Personas que llegaron a la pasarela pero no completaron el pago"
        >
          <Hourglass className="w-3 h-3" /> Intentos sin pagar
        </button>
      </div>

      {vista === "intentos" && (
        <p className="text-xs text-[#2D1A14]/45 bg-[#FAF8F5] border border-[#2D1A14]/8 rounded-xl px-4 py-2.5">
          Estos NO son pedidos: son personas que iniciaron el pago y no lo terminaron. No se cobró dinero y no hay nada que enviar. Es solo información (p. ej. para recuperar carritos).
        </p>
      )}

      {sorted.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-12 text-center">
          {intentosLoading ? (
            <RefreshCw className="w-8 h-8 text-[#A67163] animate-spin mx-auto" />
          ) : (
            <>
              <ShoppingBag className="w-10 h-10 text-[#2D1A14]/15 mx-auto mb-3" />
              <p className="text-sm text-[#2D1A14]/40">
                {q ? "Sin resultados para tu búsqueda" : vista === "intentos" ? "Sin intentos de pago en este periodo" : "Sin pedidos pagados en este periodo"}
              </p>
            </>
          )}
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
                <p className="text-sm text-[#2D1A14]"><span className="text-[#2D1A14]/50">Cédula/NIT:</span> {selectedOrder.customer_id_number || "—"}</p>
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
                    <div key={i} className="bg-[#FAF8F5] rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        {/* Foto del producto (del catálogo, vía product_id) */}
                        <span className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-white border border-[#2D1A14]/8">
                          {item.product_id && productImg[item.product_id] ? (
                            <Image src={productImg[item.product_id]} alt={item.name || "Producto"} fill sizes="48px" className="object-cover" />
                          ) : (
                            <ShoppingBag className="absolute inset-0 m-auto h-5 w-5 text-[#2D1A14]/20" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[#2D1A14]">{item.name || item.product_id}</p>
                          <p className="text-xs text-[#2D1A14]/40">x {item.quantity}</p>
                        </div>
                        {item.price ? <p className="text-sm font-semibold text-[#2D1A14] flex-shrink-0">{fmt(item.price * item.quantity)}</p> : null}
                      </div>
                      {/* Kit personalizado: frascos elegidos por el cliente */}
                      {item.kind === "pack" && item.components && item.components.length > 0 && (
                        <ul className="mt-2 space-y-1 border-t border-[#2D1A14]/10 pt-2">
                          {item.components.map((c, ci) => (
                            <li key={ci} className="flex items-center justify-between text-xs text-[#2D1A14]/70">
                              <span>• {c.name}</span>
                              <span className="text-[#2D1A14]/40">x {c.quantity}</span>
                            </li>
                          ))}
                        </ul>
                      )}
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

              {/* Update status — solo pedidos pagados; los intentos no se gestionan */}
              {selectedOrder.status === "pending" ? (
              <div className="space-y-3">
                <p className="text-xs text-[#2D1A14]/50 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  ⚠️ Este es un intento de pago sin completar: el cliente nunca pagó. No hay nada que preparar ni enviar.
                </p>
                {/* Motivo de rechazo: qué dijo Mercado Pago de cada intento */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#2D1A14]/40 mb-2">¿Por qué no se completó el pago?</p>
                  {pagosLoading ? (
                    <p className="text-xs text-[#2D1A14]/40 flex items-center gap-2">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Consultando Mercado Pago…
                    </p>
                  ) : !pagosIntento || pagosIntento.length === 0 ? (
                    <p className="text-xs text-[#2D1A14]/40 bg-[#FAF8F5] rounded-xl px-4 py-3">
                      Mercado Pago no registra ningún intento de pago con esta referencia: el cliente abandonó antes de intentar pagar (o el token de MP no está configurado).
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {pagosIntento.map(p => (
                        <div key={p.id} className="bg-[#FAF8F5] rounded-xl px-4 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${p.estado === "approved" ? "bg-green-50 text-green-700 border-green-200" : p.estado === "rejected" ? "bg-red-50 text-red-700 border-red-200" : "bg-yellow-50 text-yellow-700 border-yellow-200"}`}>
                              {MP_ESTADO_ES[p.estado || ""] || p.estado || "?"}
                            </span>
                            <span className="text-[10px] text-[#2D1A14]/40">
                              {p.fecha ? new Date(p.fecha).toLocaleString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                            </span>
                          </div>
                          <p className="text-sm text-[#2D1A14] mt-1.5">{detalleMP(p.detalle)}</p>
                          <p className="text-xs text-[#2D1A14]/40 mt-0.5">
                            {p.metodo || "método desconocido"}{typeof p.monto === "number" ? ` · ${fmt(p.monto)}` : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              ) : (
              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold uppercase tracking-widest text-[#2D1A14]/40">Actualizar estado</p>
                <select
                  value={statusInput}
                  onChange={e => setStatusInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#2D1A14]/15 bg-white text-[#2D1A14] text-sm focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
                >
                  {Object.entries(ORDER_STATUS_MAP)
                    // "pending" no es un destino válido para un pedido pagado:
                    // lo sacaría de la vista de pagados y "Reconciliar" lo
                    // re-confirmaría descontando stock por segunda vez. El API
                    // también lo rechaza (candado en el PATCH).
                    .filter(([key]) => key !== "pending")
                    .map(([key, st]) => (
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
              )}

              {/* Imprimir rótulo: abre el diálogo de impresión mostrando SOLO el
                  bloque .rotulo-print (ver <style> de abajo) — datos mínimos
                  para pegar en la caja, sin librerías. Solo pedidos reales. */}
              {selectedOrder.status !== "pending" && (
                <button
                  onClick={() => window.print()}
                  className="w-full h-11 rounded-xl border border-[#2D1A14]/15 text-[#2D1A14] font-semibold flex items-center justify-center gap-2 hover:bg-[#FAF8F5] transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir rótulo
                </button>
              )}

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

          {/* Rótulo imprimible: invisible en pantalla; al imprimir se oculta
              todo el panel y queda únicamente este bloque en la hoja. */}
          <style>{`
            .rotulo-print { display: none; }
            @media print {
              body * { visibility: hidden; }
              .rotulo-print, .rotulo-print * { visibility: visible; }
              .rotulo-print { display: block; position: fixed; inset: 0; background: #fff; color: #000; padding: 32px; z-index: 9999; }
            }
          `}</style>
          <div className="rotulo-print" style={{ fontFamily: "Arial, sans-serif" }}>
            <p style={{ fontSize: 12, margin: 0, color: "#555" }}>
              Bienestar by Cliché · Pedido #{(selectedOrder.stripe_session_id || selectedOrder.id).slice(-8).toUpperCase()}
            </p>
            <h1 style={{ fontSize: 24, margin: "10px 0 4px" }}>{selectedOrder.customer_name || "—"}</h1>
            <p style={{ fontSize: 16, margin: "2px 0" }}>Tel: {selectedOrder.customer_phone || "—"}</p>
            {selectedOrder.customer_id_number && (
              <p style={{ fontSize: 14, margin: "2px 0" }}>Cédula/NIT: {selectedOrder.customer_id_number}</p>
            )}
            <p style={{ fontSize: 18, margin: "10px 0 2px", fontWeight: 700 }}>{selectedOrder.shipping_address?.address || "—"}</p>
            <p style={{ fontSize: 16, margin: "2px 0" }}>
              {[selectedOrder.shipping_address?.city, selectedOrder.shipping_address?.department].filter(Boolean).join(", ") || "—"}
            </p>
            {selectedOrder.shipping_address?.notes && (
              <p style={{ fontSize: 13, margin: "6px 0 0", fontStyle: "italic" }}>Referencia: {selectedOrder.shipping_address.notes}</p>
            )}
            <hr style={{ margin: "14px 0", border: "none", borderTop: "1px solid #000" }} />
            <p style={{ fontSize: 12, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 1 }}>Contenido</p>
            <ul style={{ fontSize: 14, margin: 0, paddingLeft: 18 }}>
              {(selectedOrder.items || []).map((item, i) => (
                <li key={i} style={{ margin: "2px 0" }}>
                  {item.name || item.product_id} x{item.quantity}
                  {item.components && item.components.length > 0 && (
                    <span style={{ color: "#555" }}> ({item.components.map(c => `${c.name} x${c.quantity}`).join(", ")})</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
