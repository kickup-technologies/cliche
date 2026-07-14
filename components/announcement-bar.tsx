"use client"

import { useState } from "react"
import { X, Zap } from "lucide-react"
import { useSiteSettings } from "@/lib/use-site-settings"

// Nota: esta barra tenía una cuenta regresiva "hasta medianoche" que se
// reiniciaba cada día — una oferta que nunca vencía de verdad (urgencia
// ficticia, Ley 1480). Se eliminó: la barra informa beneficios REALES
// (envío gratis) sin presión falsa. El código de bienvenida se quitó del
// banner por decisión del negocio (2026-07-14): el código llega por correo.
export function AnnouncementBar() {
  const settings = useSiteSettings()
  const [isVisible, setIsVisible] = useState(true)

  const announcement = settings.announcement_text ?? ""
  const freeShip = Number(settings.free_shipping_threshold ?? 300000)
  const enabled = settings.urgency_bar_enabled !== false

  const freeShipLabel = new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", minimumFractionDigits: 0,
  }).format(freeShip)

  if (!isVisible || !enabled) return null

  // Una pasada del marquee móvil (se renderiza dos veces para el loop sin saltos)
  const marqueeItem = (
    <div className="flex shrink-0 items-center gap-2.5 px-5">
      <Zap className="w-3.5 h-3.5 flex-shrink-0 text-[#C4958A]" />
      <span className="font-semibold text-[#FAF8F5]">{announcement || `Envío gratis en compras mayores a ${freeShipLabel}`}</span>
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
        <span className="font-semibold text-[#FAF8F5]" data-cliche-edit="announcement_text" data-cliche-label="Texto del anuncio">{announcement || <>Envío gratis en compras mayores a <span className="text-[#C4958A]">{freeShipLabel}</span></>}</span>
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
