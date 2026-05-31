"use client"

import { useState, useEffect } from "react"
import { X, Zap, Clock } from "lucide-react"

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
  const [isVisible, setIsVisible] = useState(true)
  const [timeLeft, setTimeLeft] = useState(timeUntilMidnight)
  const [discountPct, setDiscountPct] = useState(10)
  const [discountCode, setDiscountCode] = useState("BIENVENIDA10")

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setDiscountPct(d.discount_percentage)
        setDiscountCode(d.discount_code)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    // Siempre termina a medianoche hoy — consistente con hero y sticky
    setTimeLeft(timeUntilMidnight())
    const timer = setInterval(() => setTimeLeft(timeUntilMidnight()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (!isVisible) return null

  return (
    <div className="bg-[#2D1A14] text-[#FAF8F5] relative">
      <div className="container mx-auto px-4 py-2 flex items-center justify-center gap-3 text-xs sm:text-sm font-medium">
        <Zap className="w-3.5 h-3.5 text-[#C4958A] flex-shrink-0" />
        <span className="hidden sm:inline text-[#FAF8F5]/70 uppercase tracking-widest text-[10px] font-semibold">Oferta del día</span>
        <span className="hidden sm:block w-px h-3 bg-[#FAF8F5]/20" />
        <span className="font-semibold text-[#FAF8F5]">Envío gratis en compras mayores a <span className="text-[#C4958A]">$300.000 COP</span></span>
        <span className="hidden md:block w-px h-3 bg-[#FAF8F5]/20" />
        <span className="hidden md:inline text-[#FAF8F5]/80">Código <span className="font-bold text-[#C4958A] tracking-wider">{discountCode}</span> → {discountPct}% OFF</span>
        <span className="hidden md:block w-px h-3 bg-[#FAF8F5]/20" />
        <div className="flex items-center gap-1.5 border border-[#FAF8F5]/20 px-2.5 py-1 rounded-full">
          <Clock className="w-3 h-3 text-[#C4958A]" />
          <span className="font-mono font-bold text-[#FAF8F5] text-xs" suppressHydrationWarning>
            {String(timeLeft.hours).padStart(2, "0")}:{String(timeLeft.minutes).padStart(2, "0")}:{String(timeLeft.seconds).padStart(2, "0")}
          </span>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="absolute right-4 p-1 hover:bg-[#FAF8F5]/10 rounded-full transition-colors text-[#FAF8F5]/60 hover:text-[#FAF8F5]"
          aria-label="Cerrar anuncio"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
