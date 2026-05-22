"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Clock, Flame, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function UrgencySection() {
  const [isVisible, setIsVisible] = useState(false)
  const [timeLeft, setTimeLeft] = useState({
    hours: 4,
    minutes: 32,
    seconds: 11
  })
  const [soldCount] = useState(12)
  const [totalStock] = useState(20)
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.2 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

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

  const formatTime = (num: number) => num.toString().padStart(2, '0')
  const progressPercent = (soldCount / totalStock) * 100

  return (
    <section ref={sectionRef} id="ofertas" className="py-16 md:py-24 bg-gradient-to-br from-primary via-accent to-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={cn(
          "grid lg:grid-cols-2 gap-8 lg:gap-12 items-center transition-all duration-700",
          isVisible ? "opacity-100" : "opacity-0"
        )}>
          {/* Image */}
          <div className={cn(
            "relative aspect-square max-w-md mx-auto lg:max-w-none rounded-3xl overflow-hidden transition-all duration-700 delay-200",
            isVisible ? "translate-x-0 opacity-100" : "-translate-x-10 opacity-0"
          )}>
            <Image
              src="/images/urgency-kit.jpg"
              alt="Kit Relax Completo"
              fill
              className="object-cover"
            />
            <div className="absolute top-4 left-4 bg-destructive text-destructive-foreground px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2">
              <Flame className="w-4 h-4" />
              OFERTA LIMITADA
            </div>
          </div>

          {/* Content */}
          <div className={cn(
            "text-white space-y-6 transition-all duration-700 delay-300",
            isVisible ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0"
          )}>
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium">
              <Flame className="w-4 h-4" />
              Solo quedan {totalStock - soldCount} disponibles
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
              Kit Relax Completo
            </h2>

            <p className="text-lg text-white/80 leading-relaxed">
              El set perfecto para transformar tu hogar en un santuario de paz. 
              Incluye difusor premium, 3 esencias naturales y vela aromatica de 50 horas.
            </p>

            {/* Price */}
            <div className="flex items-baseline gap-4">
              <span className="text-4xl font-bold">$185.000</span>
              <span className="text-xl text-white/60 line-through">$250.000</span>
              <span className="bg-white text-primary px-3 py-1 rounded-full text-sm font-bold">
                -26%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/80">Vendidos: {soldCount} de {totalStock}</span>
                <span className="text-white font-semibold">{Math.round(progressPercent)}%</span>
              </div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-400 rounded-full transition-all duration-1000"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Countdown */}
            <div className="space-y-2">
              <p className="text-white/80 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                La oferta termina en:
              </p>
              <div className="flex gap-3">
                {[
                  { value: timeLeft.hours, label: 'Horas' },
                  { value: timeLeft.minutes, label: 'Min' },
                  { value: timeLeft.seconds, label: 'Seg' },
                ].map((item, index) => (
                  <div key={index} className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center min-w-[70px]">
                    <div className="text-2xl font-bold font-mono">{formatTime(item.value)}</div>
                    <div className="text-xs text-white/80">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <Button 
              size="lg" 
              className="bg-white text-primary hover:bg-white/90 rounded-full px-8 h-14 text-lg font-bold w-full sm:w-auto"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Quiero el mio
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
