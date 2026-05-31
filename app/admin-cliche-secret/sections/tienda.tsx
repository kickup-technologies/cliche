"use client"
import { useState } from "react"
import { Save, RefreshCw, Tag, Lock } from "lucide-react"
import { adminFetch } from "@/lib/admin-client"

interface TiendaSectionProps {
  settings: Record<string, string>
  onSettingsUpdate: (settings: Record<string, string>) => void
}

export function TiendaSection({ settings, onSettingsUpdate }: TiendaSectionProps) {
  const [local, setLocal] = useState<Record<string, string>>({ ...settings })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function setField(key: string, value: string) {
    setLocal(prev => ({ ...prev, [key]: value }))
  }

  async function saveSettings() {
    setSaving(true)
    try {
      const res = await adminFetch("/api/admin/settings", {
        method: "POST",
        body: JSON.stringify({ settings: local }),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "" }))
        alert(error || "No se pudo guardar la configuración")
        return
      }
      onSettingsUpdate(local)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  const textFields = [
    { key: "announcement_text",       label: "Texto de la barra de anuncio",       placeholder: "Envío gratis a partir de $150.000" },
    { key: "free_shipping_threshold", label: "Mínimo para envío gratis (COP)",      placeholder: "150000", type: "number" },
    { key: "whatsapp_number",         label: "Número WhatsApp (con código país)",   placeholder: "573194565463" },
    { key: "whatsapp_message",        label: "Mensaje predeterminado WhatsApp",     placeholder: "Hola, me interesa..." },
    { key: "hero_title",              label: "Título del hero",                      placeholder: "Aromas que transforman tu hogar" },
    { key: "hero_subtitle",           label: "Subtítulo del hero",                  placeholder: "Fragancias artesanales..." },
  ]

  const toggleFields = [
    { key: "urgency_bar_enabled",  label: "Barra de urgencia",       desc: "Barra superior con cuenta regresiva" },
    { key: "countdown_enabled",    label: "Contador de tiempo",       desc: "Timer en productos con oferta limitada" },
    { key: "stock_badge_enabled",  label: "Badges de stock bajo",     desc: "Muestra cantidad cuando hay 5 o menos" },
    { key: "social_proof_enabled", label: "Notificaciones sociales",  desc: "Toast tipo compra reciente" },
  ]

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="font-serif text-2xl font-bold text-[#2D1A14]">Configuración de Tienda</h2>
        <p className="text-sm text-[#2D1A14]/50 mt-0.5">Ajustes generales y textos de la tienda</p>
      </div>

      {/* Text fields */}
      <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-6 space-y-5">
        <h3 className="text-sm font-semibold text-[#2D1A14] mb-1">Configuración general</h3>
        {textFields.map(({ key, label, placeholder, type }) => (
          <div key={key}>
            <label className="text-xs font-semibold uppercase tracking-widest text-[#2D1A14]/50 mb-1.5 block">{label}</label>
            <input
              type={type || "text"}
              value={local[key] || ""}
              onChange={e => setField(key, e.target.value)}
              placeholder={placeholder}
              className="w-full px-4 py-3 rounded-xl border border-[#2D1A14]/15 bg-[#FAF8F5] text-[#2D1A14] text-sm focus:outline-none focus:ring-2 focus:ring-[#A67163]/40"
            />
          </div>
        ))}
      </div>

      {/* Toggle fields */}
      <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-6 space-y-3">
        <h3 className="text-sm font-semibold text-[#2D1A14] mb-3">Efectos de conversión</h3>
        {toggleFields.map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between gap-4 py-2 border-b border-[#2D1A14]/5 last:border-0">
            <div>
              <p className="text-sm font-semibold text-[#2D1A14]">{label}</p>
              <p className="text-xs text-[#2D1A14]/40 mt-0.5">{desc}</p>
            </div>
            <button
              onClick={() => setField(key, local[key] === "true" ? "false" : "true")}
              className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${local[key] === "true" ? "bg-[#A67163]" : "bg-[#2D1A14]/15"}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${local[key] === "true" ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={saveSettings}
        disabled={saving}
        className="w-full h-11 rounded-xl bg-[#2D1A14] hover:bg-[#3D2A24] text-white font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
      >
        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : saved ? <Tag className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saved ? "Cambios guardados" : "Guardar configuración"}
      </button>

      <div className="bg-[#2D1A14]/5 border border-[#2D1A14]/10 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <Lock className="w-3.5 h-3.5 text-[#2D1A14]/50" />
          <p className="text-sm font-semibold text-[#2D1A14]">Acceso protegido</p>
        </div>
        <p className="text-xs text-[#2D1A14]/50">
          Esta URL es privada. La contraseña se configura con la variable de entorno <code className="font-mono">ADMIN_PASSWORD</code> en Vercel.
        </p>
      </div>
    </div>
  )
}
