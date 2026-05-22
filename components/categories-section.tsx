"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

const categories = [
  {
    id: 1,
    name: "Difusores",
    description: "Transforma tu ambiente",
    image: "/images/category-diffusers.jpg",
    href: "#difusores",
  },
  {
    id: 2,
    name: "Esencias",
    description: "Aromas naturales",
    image: "/images/category-essences.jpg",
    href: "#esencias",
  },
  {
    id: 3,
    name: "Kits de Regalo",
    description: "El obsequio perfecto",
    image: "/images/category-kits.jpg",
    href: "#kits",
  },
]

export function CategoriesSection() {
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
    <section ref={sectionRef} className="py-16 md:py-24 bg-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={cn(
          "text-center mb-12 transition-all duration-500",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        )}>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Explora por categoria
          </h2>
          <p className="text-muted-foreground text-lg">
            Encuentra el producto perfecto para cada espacio
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {categories.map((category, index) => (
            <a
              key={category.id}
              href={category.href}
              className={cn(
                "group relative aspect-[4/5] rounded-2xl overflow-hidden transition-all duration-500",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              {/* Background Image */}
              <Image
                src={category.image}
                alt={category.name}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent group-hover:from-primary/80 group-hover:via-primary/40 transition-all duration-500" />
              
              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-end p-6">
                <h3 className="text-2xl font-bold text-white mb-1">{category.name}</h3>
                <p className="text-white/80 mb-4">{category.description}</p>
                <div className="flex items-center gap-2 text-white font-semibold opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                  <span>Explorar</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
