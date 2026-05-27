import { ArrowUpRight, ArrowDownRight, type LucideProps } from "lucide-react"
import type { ForwardRefExoticComponent, RefAttributes } from "react"

type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>

export function StatCard({
  label, value, sub, icon: Icon, iconColor, change,
}: {
  label: string; value: string | number; sub?: string
  icon: LucideIcon; iconColor: string
  change?: number | null
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#2D1A14]/8 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-[#2D1A14]/50 font-semibold uppercase tracking-wider">{label}</p>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <p className="text-2xl font-bold text-[#2D1A14] leading-none mb-1">{value}</p>
      {sub && <p className="text-xs text-[#2D1A14]/40 mt-0.5">{sub}</p>}
      {change !== undefined && change !== null && (
        <div className={`mt-2 flex items-center gap-1 text-xs font-semibold ${change >= 0 ? "text-green-600" : "text-red-500"}`}>
          {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(change).toFixed(1)}% vs periodo anterior
        </div>
      )}
      {change === null && <p className="mt-2 text-xs text-[#2D1A14]/30">— sin datos anteriores</p>}
    </div>
  )
}
