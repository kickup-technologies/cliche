"use client"
import { useEffect, useState } from "react"
import { Zap, Info, Check, Package, Clock, Users, RotateCcw, Eye } from "lucide-react"
import { Order, CONFIRMED } from "../types"
import type { Product } from "@/lib/supabase"
import { adminFetch } from "@/lib/admin-client"
import { URGENCY_DEFAULTS, parseUrgencyConfig, fillUrgency, type UrgencyConfig } from "@/lib/urgency"

/* ────────────────────────────────────────────────────────────────────────
   Sub-componentes de UI
   ──────────────────────────────────────────────────────────────────────── */

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex-shrink-0 w-12 h-7 rounded-full transition-colors ${on ? "bg-[#A67163]" : "bg-[#2D1A14]/15"}`}
      aria-pressed={on}
    >
      <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${on ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  )
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-[#2D1A14]/45 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-[#2D1A14]/35 mt-1">{hint}</span>}
    </label>
  )
}

const inputCls =
  "w-full rounded-xl border border-[#2D1A14]/12 bg-white px-3 py-2 text-sm text-[#2D1A14] focus:outline-none focus:ring-2 focus:ring-[#A67163]/30 focus:border-[#A67163]/40"

/* ────────────────────────────────────────────────────────────────────────
   Sugerencias por producto (algoritmo) — panel informativo secundario
   ──────────────────────────────────────────────────────────────────────── */

function topSuggestions(products: Product[], orders: Order[]) {
  const last30 = orders.filter(
    o => new Date(o.created_at) >= new Date(Date.now() - 30 * 86400000) && CONFIRMED.includes(o.status)
  )
  return products
    .filter(p => p.is_active)
    .map(p => {
      const unitsSold = last30.reduce((s, o) => s + (o.items?.find(i => i.product_id === p.id)?.quantity || 0), 0)
      let tip = ""
      if (p.stock <= 3) tip = `Stock crítico (${p.stock}). La escasez real es tu mejor arma — actívala.`
      else if (p.stock <= 8 && unitsSold > 0) tip = `Stock bajo (${p.stock}) con ventas. Combina escasez + prueba social.`
      else if (unitsSold === 0) tip = `Sin ventas en 30 días. Prueba contador de oferta para empujar la decisión.`
      else tip = `${unitsSold} uds vendidas/mes. Prueba social refuerza sin presionar.`
      return { id: p.id, name: p.name, stock: p.stock, unitsSold, tip }
    })
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 4)
}

/* ────────────────────────────────────────────────────────────────────────
   Sección principal
   ──────────────────────────────────────────────────────────────────────── */

export function UrgenciaSection({ orders, products }: { orders: Order[]; products: Product[] }) {
  const [cfg, setCfg] = useState<UrgencyConfig>(URGENCY_DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Cargar configuración guardada
  useEffect(() => {
    let alive = true
    fetch("/api/settings")
      .then(r => r.json())
      .then(d => { if (alive) setCfg(parseUrgencyConfig(d.urgency_config)) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  function patch<K extends keyof UrgencyConfig>(section: K, value: Partial<UrgencyConfig[K]>) {
    setCfg(prev => ({ ...prev, [section]: { ...prev[section], ...value } }))
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    try {
      const res = await adminFetch("/api/admin/settings", {
        method: "POST",
        body: JSON.stringify({ settings: { urgency_config: JSON.stringify(cfg) } }),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "" }))
        alert(error || "No se pudo guardar la configuración de urgencia")
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  // Vista previa: usa el stock más bajo de un producto activo para que se vea realista
  const sampleStock = Math.min(
    ...products.filter(p => p.is_active).map(p => p.stock).filter(n => Number.isFinite(n)),
    cfg.low_stock.threshold
  )
  const suggestions = topSuggestions(products, orders)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#2D1A14]">Urgencia Inteligente</h2>
          <p className="text-sm text-[#2D1A14]/50 mt-0.5">
            Enciende, apaga y edita los disparadores de conversión. Lo que guardes aquí se aplica en la página de cada producto.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setCfg(URGENCY_DEFAULTS); setSaved(false) }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-[#2D1A14]/60 hover:bg-[#2D1A14]/5 transition-all"
            title="Restaurar los textos y números recomendados"
          >
            <RotateCcw className="w-4 h-4" /> Defaults
          </button>
          <button
            onClick={save}
            disabled={saving || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[#2D1A14] text-white hover:bg-[#3D2A24] disabled:opacity-40 transition-all"
          >
            {saving ? <Zap className="w-4 h-4 animate-pulse" /> : saved ? <Check className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
            {saved ? "Guardado y aplicado" : "Guardar y aplicar"}
          </button>
        </div>
      </div>

      {/* Ayuda */}
      <div className="bg-[#2D1A14]/5 border border-[#2D1A14]/10 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-[#2D1A14]/50 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-[#2D1A14]/60 space-y-1">
            <p className="font-semibold text-[#2D1A14]">¿No sabes qué poner? Ya está resuelto.</p>
            <p>
              Los textos y números por defecto están calibrados con principios de psicología del consumidor (aversión a la pérdida,
              fecha límite y prueba social). Edita lo que quieras o pulsa <strong>Defaults</strong> para volver a lo recomendado.
              Usa <code className="px-1 bg-[#2D1A14]/8 rounded">{"{stock}"}</code> para las unidades reales y{" "}
              <code className="px-1 bg-[#2D1A14]/8 rounded">{"{n}"}</code> para el número de personas viendo.
            </p>
          </div>
        </div>
      </div>

      {/* ── 1. Escasez / Low stock ── */}
      <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[#2D1A14]">Escasez de stock</h3>
              <p className="text-xs text-[#2D1A14]/45 mt-0.5">&ldquo;Solo quedan pocas&rdquo; — aversión a la pérdida</p>
            </div>
          </div>
          <Toggle on={cfg.low_stock.enabled} onClick={() => patch("low_stock", { enabled: !cfg.low_stock.enabled })} />
        </div>
        {cfg.low_stock.enabled && (
          <div className="grid sm:grid-cols-[1fr_140px] gap-4">
            <Field label="Mensaje" hint="Usa {stock} para insertar las unidades reales del producto.">
              <input
                className={inputCls}
                value={cfg.low_stock.message}
                onChange={e => patch("low_stock", { message: e.target.value })}
              />
            </Field>
            <Field label="Mostrar si quedan ≤" hint="Unidades">
              <input
                type="number" min={1} max={99}
                className={inputCls}
                value={cfg.low_stock.threshold}
                onChange={e => patch("low_stock", { threshold: Math.max(1, Number(e.target.value) || 1) })}
              />
            </Field>
          </div>
        )}
      </div>

      {/* ── 2. Contador / oferta limitada ── */}
      <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[#2D1A14]">Oferta por tiempo limitado</h3>
              <p className="text-xs text-[#2D1A14]/45 mt-0.5">Cuenta regresiva — fecha límite reduce la postergación</p>
            </div>
          </div>
          <Toggle on={cfg.countdown.enabled} onClick={() => patch("countdown", { enabled: !cfg.countdown.enabled })} />
        </div>
        {cfg.countdown.enabled && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Título de la oferta">
                <input className={inputCls} value={cfg.countdown.headline} onChange={e => patch("countdown", { headline: e.target.value })} />
              </Field>
              <Field label="Texto antes del reloj">
                <input className={inputCls} value={cfg.countdown.message} onChange={e => patch("countdown", { message: e.target.value })} />
              </Field>
            </div>
            <Field label="Duración del contador (horas)" hint="Ej.: 24 = un día · 2 = oferta relámpago. Decides tú.">
              <div className="flex items-center gap-2 flex-wrap">
                {[2, 6, 12, 24, 48].map(h => (
                  <button
                    key={h}
                    onClick={() => patch("countdown", { hours: h })}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${cfg.countdown.hours === h ? "bg-[#2D1A14] text-white" : "bg-[#2D1A14]/5 text-[#2D1A14]/60 hover:bg-[#2D1A14]/10"}`}
                  >
                    {h}h
                  </button>
                ))}
                <input
                  type="number" min={1} max={168}
                  className={`${inputCls} w-24`}
                  value={cfg.countdown.hours}
                  onChange={e => patch("countdown", { hours: Math.min(168, Math.max(1, Number(e.target.value) || 1)) })}
                />
              </div>
            </Field>
          </div>
        )}
      </div>

      {/* ── 3. Prueba social en vivo ── */}
      <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[#2D1A14]">Prueba social en vivo</h3>
              <p className="text-xs text-[#2D1A14]/45 mt-0.5">&ldquo;X personas viendo ahora&rdquo; — efecto manada</p>
            </div>
          </div>
          <Toggle on={cfg.social_proof.enabled} onClick={() => patch("social_proof", { enabled: !cfg.social_proof.enabled })} />
        </div>
        {cfg.social_proof.enabled && (
          <div className="grid sm:grid-cols-[1fr_100px_100px] gap-4">
            <Field label="Mensaje" hint="Usa {n} para el número de personas.">
              <input className={inputCls} value={cfg.social_proof.message} onChange={e => patch("social_proof", { message: e.target.value })} />
            </Field>
            <Field label="Mínimo">
              <input
                type="number" min={1} max={999}
                className={inputCls}
                value={cfg.social_proof.min}
                onChange={e => patch("social_proof", { min: Math.max(1, Number(e.target.value) || 1) })}
              />
            </Field>
            <Field label="Máximo">
              <input
                type="number" min={1} max={999}
                className={inputCls}
                value={cfg.social_proof.max}
                onChange={e => patch("social_proof", { max: Math.max(cfg.social_proof.min, Number(e.target.value) || cfg.social_proof.min) })}
              />
            </Field>
          </div>
        )}
      </div>

      {/* ── Vista previa en vivo ── */}
      <div className="bg-gradient-to-br from-[#2D1A14] to-[#3D2A24] rounded-2xl p-6 text-white">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-4 h-4 text-white/60" />
          <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Vista previa — así lo verá el cliente</p>
        </div>
        <div className="space-y-2.5">
          {cfg.low_stock.enabled && (
            <div className="inline-flex items-center gap-2 bg-red-600 text-white text-sm font-bold px-3 py-1.5 rounded-full animate-pulse">
              <Package className="w-3.5 h-3.5" />
              {fillUrgency(cfg.low_stock.message, { stock: Number.isFinite(sampleStock) ? sampleStock : 3 })}
            </div>
          )}
          {cfg.countdown.enabled && (
            <div className="bg-white/10 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-amber-300">{cfg.countdown.headline}</p>
              <p className="text-xs text-white/70 mt-0.5">
                {cfg.countdown.message}{" "}
                <span className="font-mono font-bold text-white">{String(cfg.countdown.hours).padStart(2, "0")}:00:00</span>
              </p>
            </div>
          )}
          {cfg.social_proof.enabled && (
            <p className="text-sm text-white/80 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              {fillUrgency(cfg.social_proof.message, { n: Math.round((cfg.social_proof.min + cfg.social_proof.max) / 2) })}
            </p>
          )}
          {!cfg.low_stock.enabled && !cfg.countdown.enabled && !cfg.social_proof.enabled && (
            <p className="text-sm text-white/40 italic">Todos los disparadores están apagados.</p>
          )}
        </div>
      </div>

      {/* ── Sugerencias del algoritmo (informativo) ── */}
      {suggestions.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-[#A67163]" />
            <h3 className="font-semibold text-[#2D1A14] text-sm">Sugerencias según tus datos</h3>
          </div>
          <div className="space-y-2">
            {suggestions.map(s => (
              <div key={s.id} className="flex items-start gap-3 text-sm">
                <span className="font-medium text-[#2D1A14] min-w-0 truncate max-w-[40%]">{s.name}</span>
                <span className="text-[#2D1A14]/55 flex-1">{s.tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
