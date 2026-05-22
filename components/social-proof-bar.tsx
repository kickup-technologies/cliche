"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

const reviews = [
  {
    id: 1,
    name: "Maria Fernanda",
    avatar: "MF",
    rating: 5,
    text: "El difusor cambio completamente el ambiente de mi sala. Lo amo!",
  },
  {
    id: 2,
    name: "Carlos Andres",
    avatar: "CA",
    rating: 5,
    text: "Excelente calidad y los aromas son increibles. 100% recomendado.",
  },
  {
    id: 3,
    name: "Laura Sofia",
    avatar: "LS",
    rating: 5,
    text: "El kit de relajacion es perfecto para mis noches de spa en casa.",
  },
  {
    id: 4,
    name: "Andres Felipe",
    avatar: "AF",
    rating: 5,
    text: "Envio super rapido y el producto llego perfectamente empacado.",
  },
]

export function SocialProofBar() {
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
    <section ref={sectionRef} className="bg-muted py-8 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-6 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory md:grid md:grid-cols-4 md:gap-6">
          {reviews.map((review, index) => (
            <div
              key={review.id}
              className={cn(
                "flex-shrink-0 w-72 md:w-auto snap-start bg-white rounded-xl p-4 shadow-sm transition-all duration-500",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              )}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-primary">{review.avatar}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-foreground text-sm truncate">{review.name}</span>
                    <div className="flex gap-0.5">
                      {[...Array(review.rating)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm line-clamp-2">{`"${review.text}"`}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
