"use client"
import { Period, PERIODS } from "../types"

export function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex items-center gap-0.5 bg-[#2D1A14]/5 rounded-xl p-1">
      {PERIODS.map(p => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            value === p.value ? "bg-white text-[#2D1A14] shadow-sm" : "text-[#2D1A14]/50 hover:text-[#2D1A14]"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
