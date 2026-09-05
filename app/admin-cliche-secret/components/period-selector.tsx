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
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-0.5 bg-[#2D1A14]/5 rounded-xl p-1">
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => onChange(p.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              !isMonth && value === p.value ? "bg-white text-[#2D1A14] shadow-sm" : "text-[#2D1A14]/50 hover:text-[#2D1A14]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <select
        value={isMonth ? value : ""}
        onChange={e => { if (e.target.value) onChange(e.target.value as Period) }}
        className={`px-3 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition-all focus:outline-none ${
          isMonth
            ? "bg-[#2D1A14] text-white border-[#2D1A14]"
            : "bg-white text-[#2D1A14]/60 border-[#2D1A14]/15 hover:border-[#2D1A14]/30"
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
