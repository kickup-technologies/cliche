"use client"

import { useState } from "react"
import { MessageCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"

export function WhatsAppButton() {
  const [isHovered, setIsHovered] = useState(false)
  const phoneNumber = "573194565463"
  const message = "Hola! Vi sus productos en la tienda online y me gustaría saber más 🌿"

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Tooltip */}
      <div
        className={cn(
          "absolute bottom-full right-0 mb-3 bg-card rounded-lg shadow-lg border border-border/50 p-3 transition-all duration-300",
          isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
        )}
      >
        <p className="text-sm font-medium text-foreground whitespace-nowrap">
          ¿Necesitas ayuda?
        </p>
        <p className="text-xs text-muted-foreground">
          Chatea con nosotros
        </p>
        {/* Arrow */}
        <div className="absolute -bottom-2 right-6 w-4 h-4 bg-card border-r border-b border-border/50 transform rotate-45" />
      </div>

      {/* WhatsApp button */}
      <a
        href={`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Contactar por WhatsApp"
      >
        <MessageCircle className="w-6 h-6 fill-white" />
      </a>

      {/* Pulse animation */}
      <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-25" />
    </div>
  )
}
