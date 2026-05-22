"use client"

import { useEffect, useRef, useState } from "react"
import { Sparkles, Truck, Heart } from "lucide-react"
import { cn } from "@/lib/utils"

const steps = [
  {
    icon: Sparkles,
    number: "01",
    title: "Elige tu aroma",
    description: "Mas de 20 fragancias naturales disponibles para cada momento y espacio.",
  },
  {
    icon: Truck,
    number: "02",
    title: "Recibelo en casa",
    description: "Envio en 2-3 dias habiles a toda Colombia con empaque especial.",
  },
  {
    icon: Heart,
    number: "03",
    title: "Transforma tu espacio",
    description: "Rituales de bienestar que se sienten desde el primer uso.",
  },
]

export function HowItWorks() {
  const [isVisible, setIsVisible] = useState(false)
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

  return (
    <section ref={sectionRef} className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={cn(
          "text-center mb-12 transition-all duration-500",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        )}>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Como funciona
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Tres simples pasos para transformar tu hogar en un santuario de bienestar
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className={cn(
                "relative bg-white border border-border rounded-2xl p-8 text-center transition-all duration-500 hover:shadow-lg hover:border-primary/30",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              {/* Number badge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                {index + 1}
              </div>

              {/* Icon */}
              <div className="w-16 h-16 mx-auto mb-6 bg-secondary rounded-2xl flex items-center justify-center">
                <step.icon className="w-8 h-8 text-primary" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-foreground mb-3">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
