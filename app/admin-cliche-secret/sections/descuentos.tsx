"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Ticket, Plus, Trash2, Loader2, Check, X, Power, Percent, DollarSign, Copy,
} from "lucide-react"
import { adminFetch } from "@/lib/admin-client"

/**
 * Sección "Códigos de descuento" — CRUD sobre la tabla `discount_codes`.
 * Conecta con /api/admin/discount-codes (GET/POST) y /[id] (PUT/DELETE).
 * Los códigos creados aquí los valida el checkout server-side, así que
 * lo que el admin crea SÍ funciona en la tienda en tiempo real.
 */

interface DiscountCode {
  id: string
  code: string
  type: "percentage" | "fixed"
  value: number
  max_uses: number | null
  uses_count: number
  expires_at: string | null
  is_active: boolean
  created_at: string
  code_redemptions?: { count: number }[]
}

const money = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)

const inputCls = "w-full px-3 py-2 rounded-xl border border-[#e7dcd6] bg-white text-sm text-[#2D1A14] focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"

const emptyForm = { code: "", type: "percentage" as "percentage" | "fixed", value: 10, max_uses: "", expires_at: "" }

export function DescuentosSection() {
  const [codes, setCodes] = useState<DiscountCode[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminFetch("/api/admin/discount-codes")
      const data = await res.json()
      setCodes(Array.isArray(data) ? data : [])
    } catch {
      setCodes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    const code = form.code.toUpperCase().trim()
    if (!code) { setError("Escribe un código (ej. BIENVENIDA10).") ; return }
    if (!form.value || Number(form.value) <= 0) { setError("El valor debe ser mayor a 0."); return }
    setSaving(true)
    try {
      const res = await adminFetch("/api/admin/discount-codes", {
        method: "POST",
        body: JSON.stringify({
          code,
          type: form.type,
          value: Number(form.value),
          max_uses: form.max_uses ? Number(form.max_uses) : null,
          expires_at: form.expires_at || null,
          is_active: true,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error === "Error al crear código" ? "Ese código ya existe o hubo un error. Prueba otro." : (d.error || "No se pudo crear."))
        return
      }
      setForm(emptyForm)
      await load()
    } catch {
      setError("Error de conexión.")
    } finally {
      setSaving(false)
    }
  }

  async function toggle(c: DiscountCode) {
    setCodes(prev => prev.map(x => x.id === c.id ? { ...x, is_active: !x.is_active } : x))
    await adminFetch(`/api/admin/discount-codes/${c.id}`, {
      method: "PUT",
      body: JSON.stringify({ is_active: !c.is_active }),
    }).catch(() => load())
  }

  async function remove(c: DiscountCode) {
    if (!confirm(`¿Eliminar el código ${c.code}? Esta acción no se puede deshacer.`)) return
    setCodes(prev => prev.filter(x => x.id !== c.id))
    await adminFetch(`/api/admin/discount-codes/${c.id}`, { method: "DELETE" }).catch(() => load())
  }

  function copy(code: string) {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(code)
      setTimeout(() => setCopied(null), 1500)
    }).catch(() => {})
  }

  const redemptions = (c: DiscountCode) => c.uses_count ?? c.code_redemptions?.[0]?.count ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2D1A14] flex items-center gap-2">
          <Ticket className="w-6 h-6 text-[#A67163]" /> Códigos de descuento
        </h1>
        <p className="text-sm text-[#9e8a84] mt-1">
          Crea cupones que tus clientes aplican en el checkout. Lo que actives aquí funciona al instante en la tienda.
        </p>
      </div>

      {/* Crear nuevo */}
      <form onSubmit={create} className="rounded-2xl border border-[#ece2dc] bg-white p-5">
        <p className="font-bold text-[#2D1A14] mb-3 flex items-center gap-2"><Plus className="w-4 h-4 text-[#A67163]" /> Nuevo código</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-1">
            <label className="block text-xs font-medium text-[#6b5a54] mb-1">Código</label>
            <input className={`${inputCls} uppercase font-mono`} placeholder="BIENVENIDA10" value={form.code}
              onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6b5a54] mb-1">Tipo</label>
            <select className={inputCls} value={form.type} onChange={e => setForm({ ...form, type: e.target.value as "percentage" | "fixed" })}>
              <option value="percentage">Porcentaje (%)</option>
              <option value="fixed">Monto fijo (COP)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6b5a54] mb-1">{form.type === "percentage" ? "% descuento" : "Monto (COP)"}</label>
            <input type="number" min={1} className={inputCls} value={form.value}
              onChange={e => setForm({ ...form, value: Number(e.target.value) })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6b5a54] mb-1">Usos máx. <span className="text-[#bcaaa3]">(opcional)</span></label>
            <input type="number" min={1} className={inputCls} placeholder="∞" value={form.max_uses}
              onChange={e => setForm({ ...form, max_uses: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6b5a54] mb-1">Expira <span className="text-[#bcaaa3]">(opcional)</span></label>
            <input type="date" className={inputCls} value={form.expires_at}
              onChange={e => setForm({ ...form, expires_at: e.target.value })} />
          </div>
        </div>
        {error && <p className="mt-3 text-xs text-red-600 flex items-center gap-1"><X className="w-3 h-3" /> {error}</p>}
        <button type="submit" disabled={saving}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2D1A14] text-white text-sm font-semibold hover:bg-[#3D2A24] transition-colors disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Crear código
        </button>
      </form>

      {/* Lista */}
      <div className="rounded-2xl border border-[#ece2dc] bg-white p-5">
        <p className="font-bold text-[#2D1A14] mb-3">Códigos existentes <span className="text-xs font-normal text-[#9e8a84]">({codes.length})</span></p>
        {loading ? (
          <div className="py-10 flex items-center justify-center gap-2 text-sm text-[#9e8a84]"><Loader2 className="w-4 h-4 animate-spin" /> Cargando…</div>
        ) : codes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#e7dcd6] bg-[#faf7f5] p-6 text-center">
            <Ticket className="w-6 h-6 text-[#c9b8b0] mx-auto mb-2" />
            <p className="text-sm font-medium text-[#6b5a54]">Aún no hay códigos</p>
            <p className="text-xs text-[#9e8a84] mt-1">Crea el primero arriba — por ejemplo <strong>BIENVENIDA10</strong> con 10%.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {codes.map(c => {
              const expired = c.expires_at && new Date(c.expires_at) < new Date()
              const usedUp = c.max_uses != null && redemptions(c) >= c.max_uses
              const live = c.is_active && !expired && !usedUp
              return (
                <div key={c.id} className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 ${live ? "border-[#e7dcd6] bg-white" : "border-[#efe6e1] bg-[#faf7f5]"}`}>
                  <button onClick={() => copy(c.code)} title="Copiar"
                    className="font-mono font-bold text-[#2D1A14] flex items-center gap-1.5 hover:text-[#A67163] transition-colors">
                    {copied === c.code ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 opacity-40" />}
                    {c.code}
                  </button>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#A67163]">
                    {c.type === "percentage" ? <><Percent className="w-3 h-3" />{c.value}%</> : <><DollarSign className="w-3 h-3" />{money(c.value)}</>}
                  </span>
                  <span className="text-xs text-[#9e8a84]">
                    {redemptions(c)}{c.max_uses != null ? ` / ${c.max_uses}` : ""} usos
                  </span>
                  {c.expires_at && (
                    <span className={`text-xs ${expired ? "text-red-500" : "text-[#9e8a84]"}`}>
                      {expired ? "Expiró" : "Vence"} {new Date(c.expires_at).toLocaleDateString("es-CO")}
                    </span>
                  )}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${live ? "bg-green-100 text-green-700" : "bg-[#e7dcd6] text-[#6b5a54]"}`}>
                    {live ? "ACTIVO" : expired ? "EXPIRADO" : usedUp ? "AGOTADO" : "PAUSADO"}
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    <button onClick={() => toggle(c)} title={c.is_active ? "Pausar" : "Activar"}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${c.is_active ? "text-[#A67163] hover:bg-[#A67163]/10" : "text-[#9e8a84] hover:bg-[#2D1A14]/5"}`}>
                      <Power className="w-4 h-4" />
                    </button>
                    <button onClick={() => remove(c)} title="Eliminar"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
