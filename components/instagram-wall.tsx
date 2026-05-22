"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Heart, Instagram } from "lucide-react"
import { cn } from "@/lib/utils"

const ugcPosts = [
  { id: 1, image: "/images/ugc-1.jpg", username: "@mariafer_wellness", likes: 234 },
  { id: 2, image: "/images/ugc-2.jpg", username: "@carlosandres_home", likes: 189 },
  { id: 3, image: "/images/ugc-3.jpg", username: "@laurasofia_zen", likes: 312 },
  { id: 4, image: "/images/hero-aromatherapy.jpg", username: "@andresfelipe_relax", likes: 156 },
  { id: 5, image: "/images/category-diffusers.jpg", username: "@valentina_aromas", likes: 278 },
  { id: 6, image: "/images/category-essences.jpg", username: "@santiago_bienestar", likes: 198 },
]

export function InstagramWall() {
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
            La comunidad Bienestar
          </h2>
          <p className="text-muted-foreground text-lg">
            Inspiate con nuestros clientes y comparte tu experiencia
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {ugcPosts.map((post, index) => (
            <a
              key={post.id}
              href="https://instagram.com/bienestarbycliche"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "group relative aspect-square rounded-xl overflow-hidden transition-all duration-500",
                isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
              )}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <Image
                src={post.image}
                alt={`Post de ${post.username}`}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-5 h-5 fill-white" />
                  <span className="font-semibold">{post.likes}</span>
                </div>
                <span className="text-sm font-medium">{post.username}</span>
              </div>
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className={cn(
          "text-center mt-10 transition-all duration-500 delay-500",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        )}>
          <a
            href="https://instagram.com/bienestarbycliche"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            <Instagram className="w-5 h-5" />
            @bienestarbycliche en Instagram
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  )
}
