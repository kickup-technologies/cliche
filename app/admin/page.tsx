"use client"

import { useState, useEffect } from "react"
import { Percent, Tag, Save, CheckCircle, AlertCircle, RefreshCw } from "lucide-react"

export default function AdminPage() {
  const [discount, setDiscount] = useState(10)
  const [code, setCode] = useState("BIENVENIDA10")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle")

  // Load current settings
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setDiscount(data.discount_percentage)
        setCode(data.discount_code)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    setStatus("idle")
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discount_percentage: discount,
          discount_code: code,
        }),
      })
      const data = await res.json()
      setStatus(data.ok ? "ok" : "error")
    } catch {
      setStatus("error")
    } finally {
      setSaving(false)
      setTimeout(() => setStatus("idle"), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Header */}
      <div className="bg-[#2D1A14] text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-wide">Panel Admin — Cliché Aromas</h1>
          <p className="text-white/50 text-sm">Configuración de la tienda</p>
        </div>
        <a
          href="/"
          className="text-sm text-white/60 hover:text-white transition-colors underline underline-offset-2"
          target="_blank"
        >
          Ver tienda →
        </a>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {loading ? (
          <div className="flex items-center gap-3 text-[#8B6E64]">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Cargando configuración...</span>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#EDD5CF]/60 shadow-sm p-8 space-y-8">
            <div>
              <h2 className="text-lg font-semibold text-[#2D1A14] mb-1">Descuento activo</h2>
              <p className="text-sm text-[#8B6E64]">
                Este descuento se muestra en el banner, el hero y el carrito. Los cambios se reflejan de inmediato en la tienda.
              </p>
            </div>

            {/* Discount Percentage Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 font-medium text-[#2D1A14]">
                  <Percent className="w-4 h-4 text-[#C4958A]" />
                  Porcentaje de descuento
                </label>
                <span className="text-3xl font-bold text-[#C4958A]">{discount}%</span>
              </div>

              <input
                type="range"
                min={5}
                max={50}
                step={5}
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-full h-2 bg-[#EDD5CF] rounded-full appearance-none cursor-pointer accent-[#C4958A]"
              />

              <div className="flex justify-between text-xs text-[#8B6E64]">
                {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((v) => (
                  <button
                    key={v}
                    onClick={() => setDiscount(v)}
                    className={`px-2 py-1 rounded-full transition-colors ${
                      discount === v
                        ? "bg-[#C4958A] text-white font-semibold"
                        : "hover:bg-[#EDD5CF] text-[#8B6E64]"
                    }`}
                  >
                    {v}%
                  </button>
                ))}
              </div>
            </div>

            {/* Discount Code */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 font-medium text-[#2D1A14]">
                <Tag className="w-4 h-4 text-[#C4958A]" />
                Código de descuento
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={30}
                className="w-full px-4 py-3 rounded-xl border border-[#EDD5CF] bg-[#FAF8F5] font-mono font-bold text-[#2D1A14] tracking-wider text-lg focus:outline-none focus:ring-2 focus:ring-[#C4958A]/40"
                placeholder="BIENVENIDA10"
              />
              <p className="text-xs text-[#8B6E64]">
                Solo letras y números. Este código se muestra en el banner y se aplica en el checkout.
              </p>
            </div>

            {/* Preview */}
            <div className="bg-[#2D1A14] text-white rounded-xl px-4 py-3 text-sm">
              <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Vista previa del banner</p>
              <p>
                Código{" "}
                <span className="font-bold text-[#C4958A] tracking-wider">{code}</span>
                {" "}→ {discount}% OFF
              </p>
            </div>

            {/* Save Button */}
            <button
              onClick={save}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-[#2D1A14] hover:bg-[#3D2A24] text-white font-semibold py-3.5 px-6 rounded-xl transition-colors disabled:opacity-60"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>

            {status === "ok" && (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-3 rounded-xl text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                ¡Cambios guardados! La tienda se actualizó automáticamente.
              </div>
            )}
            {status === "error" && (
              <div className="flex items-center gap-2 text-red-700 bg-red-50 px-4 py-3 rounded-xl text-sm font-medium">
                <AlertCircle className="w-4 h-4" />
                Error al guardar. Verifica la conexión e intenta de nuevo.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
