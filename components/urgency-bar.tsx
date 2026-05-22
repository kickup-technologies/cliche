"use client"

import { useState, useEffect } from "react"
import { X, Clock, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

export function UrgencyBar() {
  const [isVisible, setIsVisible] = useState(true)
  const [timeLeft, setTimeLeft] = useState({
    hours: 2,
    minutes: 34,
    seconds: 56
  })

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 }
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 }
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 }
        }
        return prev
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  if (!isVisible) return null

  const formatTime = (num: number) => num.toString().padStart(2, '0')

  return (
    <div className="bg-primary text-primary-foreground py-2.5 px-4 relative z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 md:gap-6 text-sm">
        <div className="flex items-center gap-4 flex-wrap justify-center">
          <span className="hidden sm:inline">Envio gratis en compras mayores a $80.000</span>
          <span className="hidden md:inline text-white/60">|</span>
          <span className="flex items-center gap-1.5">
            <span className="font-medium">Solo quedan 8 unidades del Kit Relajacion</span>
          </span>
          <span className="hidden md:inline text-white/60">|</span>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="font-mono font-semibold">
              {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
            </span>
          </div>
          <a 
            href="#ofertas" 
            className="flex items-center gap-1 font-semibold underline underline-offset-2 hover:text-white/90 transition-colors"
          >
            Ver oferta
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
        <button 
          onClick={() => setIsVisible(false)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
