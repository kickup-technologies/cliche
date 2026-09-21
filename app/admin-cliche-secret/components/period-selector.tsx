"use client"
import { Period, PERIODS, monthParts } from "../types"

// Lista de meses seleccionables: desde mayo 2026 (primer dato registrado)
// hasta el mes en curso en Bogotá, del más reciente al más viejo.
function monthOptions(): { value: Period; label: string }[] {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }))
  const opts: { value: Period; label: string }[] = []
  let y = now.getFullYear()
  let m = now.getMonth() + 1
  while (y > 2026 || (y === 2026 && m >= 5)) {
    const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("es-CO", {
      month: "long", year: "numeric", timeZone: "UTC",
    })
    opts.push({ value: `month:${y}-${String(m).padStart(2, "0")}`, label: label[0].toUpperCase() + label.slice(1) })
    m -= 1
    if (m === 0) { m = 12; y -= 1 }
  }
  return opts
}

export function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const isMonth = monthParts(value) !== null
  const months = monthOptions()
  return (
    <div className="flex items-center gap-2 sm:flex-wrap min-w-0 max-w-full">
      {/* MÓVIL: un solo selector nativo, limpio y sin desbordes ni pills
          apiladas (mismo patrón del panel de Bienestar). */}
      <select
        value={value}
        onChange={e => onChange(e.target.value as Period)}
        aria-label="Periodo"
        className="sm:hidden w-full min-w-0 h-10 px-3.5 rounded-full text-xs font-semibold bg-white text-[#2D1A14] border border-[#2D1A14]/14 shadow-[0_6px_16px_-12px_rgba(45,26,20,.4)] focus:outline-none focus:border-[#A67163]/60"
      >
        {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        <optgroup label="Mes específico">
          {months.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </optgroup>
      </select>
      {/* Control segmentado: una sola pastilla con el periodo activo en
          blanco elevado — el patrón de los paneles de Shopify/Stripe. */}
      <div className="hidden sm:flex items-center gap-1 bg-[#2D1A14]/[0.055] rounded-full p-1 ring-1 ring-inset ring-[#2D1A14]/[0.06]">
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => onChange(p.value)}
            className={`px-3.5 h-8 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
              !isMonth && value === p.value
                ? "bg-white text-[#2D1A14] shadow-[0_2px_8px_-2px_rgba(45,26,20,.25)]"
                : "text-[#2D1A14]/50 hover:text-[#2D1A14] hover:bg-white/60"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <select
        value={isMonth ? value : ""}
        onChange={e => { if (e.target.value) onChange(e.target.value as Period) }}
        className={`hidden sm:block h-10 px-3.5 rounded-full text-xs font-semibold border cursor-pointer transition-all focus:outline-none ${
          isMonth
            ? "bg-[#2D1A14] text-white border-[#2D1A14] shadow-[0_14px_28px_-16px_rgba(45,26,20,.65)]"
            : "bg-white text-[#2D1A14]/65 border-[#2D1A14]/14 shadow-[0_6px_16px_-12px_rgba(45,26,20,.4)] hover:border-[#A67163]/60"
        }`}
      >
        <option value="">Mes específico…</option>
        {months.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
