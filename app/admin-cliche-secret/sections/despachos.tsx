"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Banknote, Check, Copy, MessageCircle, PackageCheck, RefreshCw, Truck, X } from "lucide-react"
import { fmt } from "../types"
import { adminFetch } from "@/lib/admin-client"
import { CARRIERS, carrierName } from "@/lib/carriers"
import { ESTADO_COD_NUEVO, esContraentrega } from "@/lib/contraentrega"
import { PRODUCTOS_DROPI } from "@/lib/dropi-productos"
import type { Product } from "@/lib/supabase"

/**
 * Despachos: lo que hay que hacer hoy, en orden. Contra entrega se confirma
 * por WhatsApp, se crea la orden en Dropi y, con la guía, pasa a «En camino».
 * Los pagados en línea entran directo a «Por despachar».
 */
type Linea = {
  kind?: string
  product_id?: string
  name?: string
  quantity: number
  units?: number
  components?: Array<{ product_id: string; name?: string; quantity: number }>
}
type Direccion = { address?: string; city?: string; department?: string; notes?: string | null; dropi_orden?: string | null }
export type PedidoDespacho = {
  id: string
  status: string
  total: number
  created_at: string
  stripe_session_id: string | null
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  customer_id_number: string | null
  shipping_address: Direccion | null
  carrier: string | null
  tracking_number: string | null
  items: Linea[]
}

const ref = (o: PedidoDespacho) => (o.stripe_session_id || o.id).slice(-8).toUpperCase()
const dias = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
const cuando = (iso: string) => (dias(iso) <= 0 ? "hoy" : dias(iso) === 1 ? "ayer" : `hace ${dias(iso)} días`)
const waNumero = (t: string) => {
  const d = t.replace(/\D/g, "")
  return /^3\d{9}$/.test(d) ? `57${d}` : d
}
const direccionDe = (a: Direccion | null) => [a?.address, a?.city, a?.department].filter(Boolean).join(", ")

export function DespachosSection({ products }: { products: Product[] }) {
  const [pedidos, setPedidos] = useState<PedidoDespacho[] | null>(null)
  const [error, setError] = useState("")
  const [ocupado, setOcupado] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setError("")
    try {
      const res = await adminFetch("/api/admin/orders")
      if (!res.ok) throw new Error()
      setPedidos(await res.json())
    } catch {
      setError("No pudimos cargar los pedidos. Intenta de nuevo.")
    }
  }, [])
  useEffect(() => { void cargar() }, [cargar])

  async function guardar(id: string, cambios: Record<string, unknown>) {
    setOcupado(id); setError("")
    try {
      const res = await adminFetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...cambios }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPedidos((prev) => prev?.map((p) => (p.id === id ? { ...p, ...data } : p)) ?? prev)
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "No se pudo guardar.")
    }
    setOcupado(null)
  }

  const porSlug = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
  const grupos = useMemo(() => {
    const l = [...(pedidos ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at))
    return [
      { id: "confirmar", titulo: "Por confirmar", ayuda: "Contra entrega recién pedidos: escríbeles antes de despachar.", icono: MessageCircle, lista: l.filter((p) => p.status === ESTADO_COD_NUEVO) },
      { id: "despachar", titulo: "Por despachar", ayuda: "Crea la orden en Dropi, guarda la guía y márcalo despachado.", icono: PackageCheck, lista: l.filter((p) => ["confirmed", "paid", "preparing"].includes(p.status)) },
      { id: "camino", titulo: "En camino", ayuda: "Marca entregado cuando la transportadora lo confirme.", icono: Truck, lista: l.filter((p) => p.status === "shipped") },
    ]
  }, [pedidos])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl text-[#2D1A14]">Despachos</h2>
          <p className="text-sm text-[#2D1A14]/50">Pedidos contra entrega y pagados en línea, del más antiguo al más nuevo.</p>
        </div>
        <button type="button" onClick={() => void cargar()} className="inline-flex items-center gap-2 text-sm font-semibold border border-[#2D1A14]/15 rounded-xl px-3 py-2">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {error && <p role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</p>}

      <div className="grid grid-cols-3 gap-3">
        {grupos.map((g) => (
          <a key={g.id} href={`#despacho-${g.id}`} className="bg-white border border-[#2D1A14]/10 rounded-2xl p-4 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#2D1A14]/40">{g.titulo}</p>
            <p className="text-3xl font-bold text-[#2D1A14]">{pedidos ? g.lista.length : "…"}</p>
            <p className="text-xs text-[#2D1A14]/40 truncate">{fmt(g.lista.reduce((s, p) => s + p.total, 0))}</p>
          </a>
        ))}
      </div>

      {grupos.map((g) => (
        <section key={g.id} id={`despacho-${g.id}`} className="space-y-3">
          <div className="flex items-start gap-2">
            <g.icono className="w-5 h-5 text-[#A67163] mt-0.5" />
            <div>
              <h3 className="font-bold text-[#2D1A14]">{g.titulo} ({g.lista.length})</h3>
              <p className="text-xs text-[#2D1A14]/50">{g.ayuda}</p>
            </div>
          </div>
          {g.lista.length === 0 && <p className="text-sm text-[#2D1A14]/35 bg-white border border-dashed border-[#2D1A14]/10 rounded-2xl px-4 py-5">Nada pendiente aquí.</p>}
          <div className="grid gap-3 xl:grid-cols-2">
            {g.lista.map((p) => (
              <Tarjeta key={p.id} pedido={p} grupo={g.id} porSlug={porSlug} ocupado={ocupado === p.id} guardar={guardar} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function Tarjeta({ pedido: p, grupo, porSlug, ocupado, guardar }: {
  pedido: PedidoDespacho
  grupo: string
  porSlug: Map<string, Product>
  ocupado: boolean
  guardar: (id: string, cambios: Record<string, unknown>) => Promise<void>
}) {
  const cod = esContraentrega(p.stripe_session_id)
  const [orden, setOrden] = useState(p.shipping_address?.dropi_orden || "")
  const [transportadora, setTransportadora] = useState(p.carrier || "")
  const [guia, setGuia] = useState(p.tracking_number || "")
  const [copiado, setCopiado] = useState(false)

  // Frascos por aroma (un kit x4 son 4 unidades del mismo producto en Dropi).
  const frascos = useMemo(() => {
    const suma = new Map<string, { nombre: string; qty: number }>()
    const agrega = (id: string, nombre: string, qty: number) => {
      const prev = suma.get(id)
      suma.set(id, { nombre: prev?.nombre || nombre, qty: (prev?.qty || 0) + qty })
    }
    for (const it of p.items || []) {
      if (it.kind === "pack") for (const c of it.components || []) agrega(c.product_id, c.name || "Aroma", c.quantity * (it.quantity || 1))
      else if (it.product_id) agrega(it.product_id, (porSlug.get(it.product_id)?.name || it.name || "Aroma").replace(/ — Kit x\d+$/, ""), (it.quantity || 1) * (it.units || 1))
    }
    return [...suma.entries()].map(([id, v]) => {
      const d = PRODUCTOS_DROPI[porSlug.get(id)?.slug || ""]
      return { ...v, dropi: d ? `${d.id} ${d.nombre}` : v.nombre }
    })
  }, [p.items, porSlug])

  const mensaje = `¡Hola ${p.customer_name?.split(" ")[0] || ""}! Te escribimos de Cliché por tu pedido #${ref(p)}: ${frascos.map((f) => `${f.qty}× ${f.nombre}`).join(", ")}. ` +
    `${cod ? `Pagas ${fmt(p.total)} al recibir. ` : ""}Va para ${direccionDe(p.shipping_address)}. ¿Nos confirmas que los datos están correctos para despacharlo?`

  const paraDropi = [
    `Orden Dropi · Cliché #${ref(p)}`,
    `Cliente: ${p.customer_name || ""}`,
    `Cédula: ${p.customer_id_number || ""}`,
    `Celular: ${p.customer_phone || ""}`,
    `Correo: ${p.customer_email || ""}`,
    `Departamento: ${p.shipping_address?.department || ""}`,
    `Ciudad: ${p.shipping_address?.city || ""}`,
    `Dirección: ${p.shipping_address?.address || ""}`,
    ...(p.shipping_address?.notes ? [`Notas: ${p.shipping_address.notes}`] : []),
    "Productos:",
    ...frascos.map((f) => `- ${f.dropi} · ${f.qty} u`),
    cod ? `Total a recaudar: ${fmt(p.total)} (envío incluido)` : `Pagado en línea (${fmt(p.total)}): SIN recaudo`,
  ].join("\n")

  const boton = "inline-flex items-center justify-center gap-1.5 text-xs font-bold rounded-lg px-3 py-2 disabled:opacity-50"
  const campo = "w-full min-w-0 text-sm border border-[#2D1A14]/15 rounded-lg px-2.5 py-2 bg-white"

  return (
    <article className="bg-white border border-[#2D1A14]/10 rounded-2xl p-4 space-y-3 min-w-0">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono font-bold text-sm text-[#2D1A14]">#{ref(p)} <span className="font-sans font-normal text-xs text-[#2D1A14]/40">· {cuando(p.created_at)}</span></p>
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${cod ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}`}>
          {cod ? <><Banknote className="w-3 h-3" /> Contra entrega</> : <><Check className="w-3 h-3" /> Pagado en línea</>}
        </span>
      </header>
      <div className="text-sm text-[#2D1A14]">
        <p className="font-semibold">{p.customer_name || "Sin nombre"} <span className="font-normal text-[#2D1A14]/50">· {p.customer_phone}</span></p>
        <p className="text-[#2D1A14]/60 break-words">{direccionDe(p.shipping_address) || "Sin dirección"}</p>
      </div>
      <ul className="text-sm text-[#2D1A14]/80 border-y border-[#2D1A14]/8 py-2">
        {frascos.map((f) => <li key={f.nombre}>{f.qty} × {f.nombre}</li>)}
      </ul>
      <p className="text-sm font-bold text-[#2D1A14]">{cod ? "Cobrar al entregar" : "Ya pagado"}: {fmt(p.total)}</p>

      <div className="flex flex-wrap gap-2">
        {p.customer_phone && (
          <a className={`${boton} bg-green-600 text-white`} href={`https://wa.me/${waNumero(p.customer_phone)}?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noreferrer">
            <MessageCircle className="w-3.5 h-3.5" /> {grupo === "confirmar" ? "Confirmar por WhatsApp" : "WhatsApp"}
          </a>
        )}
        {grupo === "confirmar" && (
          <>
            <button type="button" disabled={ocupado} className={`${boton} bg-[#2D1A14] text-white`} onClick={() => void guardar(p.id, { status: "preparing" })}>
              <Check className="w-3.5 h-3.5" /> Confirmado, a despachar
            </button>
            <button type="button" disabled={ocupado} className={`${boton} border border-red-200 text-red-700`} onClick={() => { if (window.confirm(`¿Cancelar el pedido #${ref(p)}?`)) void guardar(p.id, { status: "cancelled" }) }}>
              <X className="w-3.5 h-3.5" /> Cancelar
            </button>
          </>
        )}
        {grupo === "despachar" && (
          <button type="button" className={`${boton} border border-[#2D1A14]/20 text-[#2D1A14]`} onClick={() => void navigator.clipboard.writeText(paraDropi).then(() => { setCopiado(true); window.setTimeout(() => setCopiado(false), 1800) })}>
            {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copiado ? "Copiado" : "Copiar datos para Dropi"}
          </button>
        )}
        {grupo === "camino" && (
          <button type="button" disabled={ocupado} className={`${boton} bg-[#2D1A14] text-white`} onClick={() => void guardar(p.id, { status: "delivered" })}>
            <Check className="w-3.5 h-3.5" /> Entregado
          </button>
        )}
      </div>

      {grupo === "despachar" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-[#2D1A14]/40">Orden Dropi
            <input className={campo} value={orden} onChange={(e) => setOrden(e.target.value)} inputMode="numeric" />
          </label>
          <label className="text-[10px] font-bold uppercase tracking-widest text-[#2D1A14]/40">Transportadora
            <select className={campo} value={transportadora} onChange={(e) => setTransportadora(e.target.value)}>
              <option value="">Elegir</option>
              {CARRIERS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="text-[10px] font-bold uppercase tracking-widest text-[#2D1A14]/40">Guía
            <input className={campo} value={guia} onChange={(e) => setGuia(e.target.value)} />
          </label>
          <button type="button" disabled={ocupado} className={`${boton} border border-[#2D1A14]/20 text-[#2D1A14]`} onClick={() => void guardar(p.id, { dropi_orden: orden, carrier: transportadora, tracking_number: guia })}>Guardar</button>
          <button type="button" disabled={ocupado || !guia.trim() || !transportadora} className={`${boton} bg-[#A67163] text-white sm:col-span-2`} onClick={() => void guardar(p.id, { dropi_orden: orden, carrier: transportadora, tracking_number: guia, status: "shipped" })}>
            <Truck className="w-3.5 h-3.5" /> Marcar despachado
          </button>
        </div>
      )}
      {grupo === "camino" && (
        <p className="text-xs text-[#2D1A14]/60">
          Guía {carrierName(p.carrier) || ""} <span className="font-mono font-bold">{p.tracking_number || "sin guía"}</span>
          {p.shipping_address?.dropi_orden ? ` · Dropi ${p.shipping_address.dropi_orden}` : ""}
        </p>
      )}
    </article>
  )
}
