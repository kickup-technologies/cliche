"use client"

import { useState } from "react"
import { Play, Instagram, Star, ChevronLeft, ChevronRight } from "lucide-react"

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.27 8.27 0 004.84 1.55V6.79a4.85 4.85 0 01-1.07-.1z" />
    </svg>
  )
}

// Testimonios visuales — reemplazar con embeds reales de UGC cuando estén disponibles
const ugcItems = [
  {
    platform: "tiktok" as const,
    username: "@mariapao.aromas",
    location: "Medellín",
    rating: 5,
    quote: "Llevaba 3 meses buscando algo así. Mi sala huele increíble con solo 3 puf de Tao.",
    thumbnail: null,
    productName: "Aroma Tao",
  },
  {
    platform: "instagram" as const,
    username: "@camilastyle_co",
    location: "Bogotá",
    rating: 5,
    quote: "Compré el kit x4 para regalar y me quedé con uno. Eternamente Índigo es ADICTIVO.",
    thumbnail: null,
    productName: "Kit Elementos x4",
  },
  {
    platform: "tiktok" as const,
    username: "@hogar.coqueto",
    location: "Cali",
    rating: 5,
    quote: "Lo aplico en mis sábanas y la ropa dura oliendo bien todo el día. No mancha nada.",
    thumbnail: null,
    productName: "Aroma Vientos de Lino",
  },
  {
    platform: "instagram" as const,
    username: "@juanita.wellbeing",
    location: "Barranquilla",
    rating: 5,
    quote: "La diferencia entre mi tienda antes y después es brutal. Los clientes me preguntan qué es.",
    thumbnail: null,
    productName: "Aroma Mahai",
  },
]

export function UGCSection() {
  const [active, setActive] = useState(0)
  const prev = () => setActive((a) => (a === 0 ? ugcItems.length - 1 : a - 1))
  const next = () => setActive((a) => (a === ugcItems.length - 1 ? 0 : a + 1))

  return (
    <section className="py-20 bg-foreground text-background overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-background/10 text-background/80 text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-full mb-4">
            <Play className="w-3.5 h-3.5 fill-current" />
            La comunidad lo dice
          </div>
          <h2 className="text-3xl lg:text-4xl font-serif font-bold text-background mb-3">
            Así huele vivir con Cliché
          </h2>
          <p className="text-background/60 max-w-md mx-auto text-sm">
            Más de 5.000 hogares colombianos ya transformaron su espacio. Únete.
          </p>
        </div>

        {/* UGC Cards — Desktop grid / Mobile carousel */}
        <div className="hidden md:grid grid-cols-4 gap-4 max-w-5xl mx-auto mb-10">
          {ugcItems.map((item, i) => (
            <UGCCard key={i} item={item} />
          ))}
        </div>

        {/* Mobile carousel */}
        <div className="md:hidden relative">
          <div className="px-4">
            <UGCCard item={ugcItems[active]} />
          </div>
          <div className="flex items-center justify-center gap-4 mt-4">
            <button
              onClick={prev}
              className="w-9 h-9 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex gap-1.5">
              {ugcItems.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i === active ? "bg-primary" : "bg-background/30"}`}
                />
              ))}
            </div>
            <button
              onClick={next}
              className="w-9 h-9 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CTA — share your experience */}
        <div className="text-center mt-10 pt-10 border-t border-background/10">
          <p className="text-background/60 text-sm mb-3">
            ¿Ya tienes tu aroma? Comparte tu experiencia y etiquétanos
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 px-4 sm:px-0">
            <a
              href="https://www.instagram.com/clichearomasoficial"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-background/10 hover:bg-background/20 text-background text-sm font-medium px-4 py-2.5 rounded-full transition-colors"
            >
              <Instagram className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">@clichearomasoficial</span>
            </a>
            <a
              href="https://www.tiktok.com/@clichearomasoficial"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-background/10 hover:bg-background/20 text-background text-sm font-medium px-4 py-2.5 rounded-full transition-colors"
            >
              <TikTokIcon className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">@clichearomasoficial</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

function UGCCard({ item }: { item: typeof ugcItems[0] }) {
  return (
    <div className="bg-background/5 border border-background/10 rounded-2xl p-5 flex flex-col gap-3 hover:bg-background/10 transition-colors">
      {/* Platform + stars */}
      <div className="flex items-center justify-between">
        {item.platform === "tiktok" ? (
          <TikTokIcon className="w-4 h-4 text-background/60" />
        ) : (
          <Instagram className="w-4 h-4 text-background/60" />
        )}
        <div className="flex">
          {Array.from({ length: item.rating }).map((_, i) => (
            <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
          ))}
        </div>
      </div>

      {/* Video thumbnail placeholder */}
      <div className="aspect-[9/16] bg-background/10 rounded-xl flex flex-col items-center justify-center gap-2 text-background/30">
        <Play className="w-8 h-8 fill-current" />
        <span className="text-xs">{item.productName}</span>
      </div>

      {/* Quote */}
      <p className="text-xs text-background/80 leading-relaxed italic">"{item.quote}"</p>

      {/* User */}
      <div>
        <p className="text-xs font-semibold text-background">{item.username}</p>
        <p className="text-xs text-background/50">{item.location}</p>
      </div>
    </div>
  )
}
