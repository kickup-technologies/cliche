"use client"

import { useState, useEffect } from "react"
import { X, Zap, Clock } from "lucide-react"

export function AnnouncementBar() {
  const [isVisible, setIsVisible] = useState(true)
  const [timeLeft, setTimeLeft] = useState({
    hours: 2,
    minutes: 0,
    seconds: 0
  })

  useEffect(() => {
    const endTime = new Date()
    endTime.setHours(endTime.getHours() + 2)

    const timer = setInterval(() => {
      const now = new Date()
      const diff = endTime.getTime() - now.getTime()

      if (diff <= 0) {
        clearInterval(timer)
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft({ hours, minutes, seconds })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  if (!isVisible) return null

  return (
    <div className="bg-gradient-to-r from-primary via-accent to-primary text-primary-foreground relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBjeD0iMjAiIGN5PSIyMCIgcj0iMiIvPjwvZz48L3N2Zz4=')] opacity-30" />
      <div className="container mx-auto px-4 py-2.5 flex items-center justify-center gap-3 text-sm font-medium relative">
        <Zap className="w-4 h-4 animate-pulse" />
        <span className="hidden sm:inline">🌿 ENVÍO GRATIS</span>
        <span className="font-bold">en compras mayores a $150.000 COP</span>
        <span className="hidden md:inline">|</span>
        <span className="hidden md:inline font-semibold">Código: BIENVENIDA20 → 20% OFF</span>
        <div className="flex items-center gap-1.5 bg-white/20 px-2.5 py-1 rounded-full">
          <Clock className="w-3.5 h-3.5" />
          <span className="font-mono font-bold">
            {String(timeLeft.hours).padStart(2, "0")}:
            {String(timeLeft.minutes).padStart(2, "0")}:
            {String(timeLeft.seconds).padStart(2, "0")}
          </span>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="absolute right-4 p-1 hover:bg-white/20 rounded-full transition-colors"
          aria-label="Cerrar anuncio"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
