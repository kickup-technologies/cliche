"use client"

import { useState } from "react"
import { MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCart } from "@/context/cart-context"
import { useSiteSettings } from "@/lib/use-site-settings"

const DEFAULT_PHONE = "573122838844"
const DEFAULT_MESSAGE = "Hola! Vi sus productos en la tienda online y me gustaría saber más"

export function WhatsAppButton() {
  const settings = useSiteSettings()
  const [isHovered, setIsHovered] = useState(false)
  const { itemCount, isDrawerOpen } = useCart()
  const phoneNumber = settings.whatsapp_number
    ? String(settings.whatsapp_number).replace(/\D/g, "")
    : DEFAULT_PHONE
  const message = settings.whatsapp_message || DEFAULT_MESSAGE

  // Se oculta cuando el drawer del carrito está abierto para no interferir
  if (isDrawerOpen) return null

  return (
    <div className={cn(
      "fixed right-6 z-50 transition-all duration-300",
      itemCount > 0 ? "bottom-24" : "bottom-6"
    )}>
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
