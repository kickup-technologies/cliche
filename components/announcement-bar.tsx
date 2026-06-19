"use client"

import { useState, useEffect } from "react"
import { X, Zap, Clock } from "lucide-react"
import { useSiteSettings } from "@/lib/use-site-settings"

// Tiempo restante hasta medianoche de hoy. Se calcula al instante para que el
// contador nunca aparezca en 00:00:00 durante el primer render.
function timeUntilMidnight() {
  const end = new Date()
  end.setHours(23, 59, 59, 0)
  const diff = end.getTime() - Date.now()
  if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0 }
  return {
    hours: Math.floor(diff / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
  }
}

export function AnnouncementBar() {
  const settings = useSiteSettings()
  const [isVisible, setIsVisible] = useState(true)
  const [timeLeft, setTimeLeft] = useState(timeUntilMidnight)

  const discountPct = settings.discount_percentage ?? 10
  const discountCode = settings.discount_code ?? "BIENVENIDA10"
  const announcement = settings.announcement_text ?? ""
  const freeShip = Number(settings.free_shipping_threshold ?? 300000)
  const enabled = settings.urgency_bar_enabled !== false

  const freeShipLabel = new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", minimumFractionDigits: 0,
  }).format(freeShip)

  useEffect(() => {
    // Siempre termina a medianoche hoy — consistente con hero y sticky
    setTimeLeft(timeUntilMidnight())
    const timer = setInterval(() => setTimeLeft(timeUntilMidnight()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (!isVisible || !enabled) return null

  const timer = `${String(timeLeft.hours).padStart(2, "0")}:${String(timeLeft.minutes).padStart(2, "0")}:${String(timeLeft.seconds).padStart(2, "0")}`

  // Una pasada del marquee móvil (se renderiza dos veces para el loop sin saltos)
  const marqueeItem = (
    <div className="flex shrink-0 items-center gap-2.5 px-5">
      <Zap className="w-3.5 h-3.5 flex-shrink-0 text-[#C4958A]" />
      <span className="font-semibold text-[#FAF8F5]">{announcement || `Envío gratis en compras mayores a ${freeShipLabel}`}</span>
      <span className="text-[#FAF8F5]/30">•</span>
      <span className="text-[#FAF8F5]/80">Código <span className="font-bold tracking-wider text-[#C4958A]">{discountCode}</span> → {discountPct}% OFF</span>
      <span className="text-[#FAF8F5]/30">•</span>
      <span className="inline-flex items-center gap-1.5">
        <Clock className="w-3 h-3 text-[#C4958A]" />
        <span className="font-mono font-bold text-[#FAF8F5]" suppressHydrationWarning>{timer}</span>
      </span>
      <span className="text-[#FAF8F5]/30">•</span>
    </div>
  )

  return (
    <div className="relative overflow-hidden bg-[#2D1A14] text-[#FAF8F5]">
      {/* Celular: UNA sola línea con marquee en loop (se lee todo sin cortar) */}
      <div className="relative overflow-hidden py-2.5 pr-9 text-[11px] font-medium sm:hidden">
        <div className="ann-track flex w-max whitespace-nowrap will-change-transform">
          {marqueeItem}
          {marqueeItem}
        </div>
      </div>

      {/* Tablet/PC: una línea estática centrada */}
      <div className="container mx-auto hidden items-center justify-center gap-3 px-10 py-2.5 text-sm font-medium sm:flex">
        <Zap className="w-3.5 h-3.5 flex-shrink-0 text-[#C4958A]" />
        <span className="text-[#FAF8F5]/70 uppercase tracking-widest text-[10px] font-semibold">Oferta del día</span>
        <span className="w-px h-3 bg-[#FAF8F5]/20" />
        <span className="font-semibold text-[#FAF8F5]" data-cliche-edit="announcement_text" data-cliche-label="Texto del anuncio">{announcement || <>Envío gratis en compras mayores a <span className="text-[#C4958A]">{freeShipLabel}</span></>}</span>
        <span className="hidden md:block w-px h-3 bg-[#FAF8F5]/20" />
        <span className="hidden md:inline text-[#FAF8F5]/80">Código <span className="font-bold text-[#C4958A] tracking-wider">{discountCode}</span> → {discountPct}% OFF</span>
        <span className="hidden md:block w-px h-3 bg-[#FAF8F5]/20" />
        <div className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-[#FAF8F5]/20 px-2.5 py-1">
          <Clock className="w-3 h-3 text-[#C4958A]" />
          <span className="font-mono font-bold text-[#FAF8F5] text-xs" suppressHydrationWarning>{timer}</span>
        </div>
      </div>

      <button
        onClick={() => setIsVisible(false)}
        className="absolute right-2.5 top-1/2 z-10 -translate-y-1/2 rounded-full p-1 text-[#FAF8F5]/60 transition-colors hover:bg-[#FAF8F5]/10 hover:text-[#FAF8F5]"
        aria-label="Cerrar anuncio"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <style jsx>{`
        .ann-track {
          animation: ann-marquee 20s linear infinite;
        }
        @keyframes ann-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}
