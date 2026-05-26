"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useCart } from "@/context/cart-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ShoppingBag, Star, Shield, Truck, RefreshCw,
  ChevronRight, Plus, Minus, Share2, Heart, CheckCircle,
  Wind, Shirt, Home, AlertTriangle, Package, Gift, RotateCcw
} from "lucide-react"
import type { Product } from "@/lib/supabase"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { WhatsAppButton } from "@/components/whatsapp-button"
import { ReviewsSection } from "@/components/reviews-section"
import { CountdownTimer } from "@/components/urgency-elements"

interface Props {
  product: Product
  related: Product[]
}

const NOTES_MAP: Record<string, string[]> = {
  // Elementos básicos
  "aroma-agua":              ["Bergamota Italia", "Lirio Acuático", "Almizcle Marino"],
  "aroma-aire":              ["Ozono Fresco", "Bambú Verde", "Almizcle Blanco"],
  "aroma-tierra":            ["Pachulí", "Cedro Virginia", "Vetiver"],
  "aroma-fuego":             ["Canela", "Ámbar Dorado", "Sándalo"],
  // Florales y sedosos
  "aroma-brillos-de-seda":   ["Flores Blancas", "Seda Natural", "Almizcle Suave"],
  "aroma-brillos-seda":      ["Flores Blancas", "Seda Natural", "Almizcle Suave"],
  "aroma-indigo-profundo":   ["Lavanda", "Violeta", "Cedro Oscuro"],
  "aroma-eternamente-indigo":["Iris Azul", "Violeta Intensa", "Almizcle Profundo"],
  "aroma-hilos-de-seda":     ["Seda Blanca", "Polvos Suaves", "Almizcle Cremoso"],
  // Amaderados y cálidos
  "aroma-tao":               ["Sándalo Zen", "Bambú", "Agua de Rosas"],
  "aroma-mahai":             ["Coco Tropical", "Vainilla", "Flor de Tiaré"],
  "aroma-calor-de-lana":     ["Cachemir", "Ámbar Cálido", "Vainilla Suave"],
  "aroma-dulce-lana":        ["Ámbar Dorado", "Lana Suave", "Vainilla"],
  "aroma-crema":             ["Vainilla Cremosa", "Leche de Almendra", "Azúcar Moscabado"],
  "aroma-sello-de-dios":     ["Incienso", "Mirra", "Madera Sagrada"],
  "aroma-luxury":            ["Oud Árabe", "Ámbar Oriental", "Especias Exóticas"],
  // Frescos y ligeros
  "aroma-vientos-de-lino":   ["Lino Limpio", "Algodón Fresco", "Brisa Marina"],
  "aroma-frescura-de-lino":  ["Lino Suave", "Cedro Blanco", "Brisa Fresca"],
  "aroma-lycra-de-verano":   ["Cítricos Vibrantes", "Sal Marina", "Vetiver"],
  // Especiales / colección
  "aroma-romeo-y-julieta":   ["Rosa Roja", "Jazmín", "Almizcle Blanco"],
  "aroma-best-friends":      ["Frambuesa", "Flores Dulces", "Azúcar Suave"],
  "aroma-happiness":         ["Cítricos Alegres", "Flores de Primavera", "Almizcle Fresco"],
  "aroma-navidad":           ["Pino Natural", "Canela", "Naranja Especiada"],
}

export function ProductDetail({ product, related }: Props) {
  const { addItem } = useCart()
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [activeTab, setActiveTab] = useState<"descripcion" | "uso" | "envio">("descripcion")
  const [viewers, setViewers] = useState(() => Math.floor(Math.random() * 16) + 7)
  const [offerEnd, setOfferEnd] = useState<Date | null>(null)

  // Viewers en vivo — fluctúa cada 18s
  useEffect(() => {
    const id = setInterval(() => {
      setViewers((v) => Math.max(4, Math.min(28, v + (Math.random() > 0.45 ? 1 : -1))))
    }, 18000)
    return () => clearInterval(id)
  }, [])

  // Countdown de oferta por sesión
  useEffect(() => {
    const key = `cliche_offer_${product.id}`
    const stored = sessionStorage.getItem(key)
    if (stored) {
      setOfferEnd(new Date(stored))
    } else {
      const hours = Math.floor(Math.random() * 3) + 2
      const end = new Date(Date.now() + hours * 3_600_000)
      sessionStorage.setItem(key, end.toISOString())
      setOfferEnd(end)
    }
  }, [product.id])

  const notes = NOTES_MAP[product.slug] || []
  const isKit = product.slug.startsWith("kit-")
  const savings = product.original_price ? product.original_price - product.price : 0

  function handleAdd() {
    for (let i = 0; i < qty; i++) addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-24 pb-16">
        {/* Breadcrumb */}
        <div className="container mx-auto px-4 mb-6">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary transition-colors">Inicio</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/#productos" className="hover:text-primary transition-colors">Productos</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium truncate max-w-[200px]">{product.name}</span>
          </nav>
        </div>

        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 mb-20">
            {/* Product Image */}
            <div className="relative">
              <div className="sticky top-28">
                <div className="relative aspect-square bg-muted/30 rounded-3xl overflow-hidden">
                  <img
                    src={product.image_url || "/placeholder-product.jpg"}
                    alt={product.name}
                    className="w-full h-full object-contain p-8"
                  />
                  {product.badge && (
                    <div className="absolute top-4 left-4">
                      <span className={`${product.badge_color || 'bg-primary'} text-white text-xs font-bold px-3 py-1.5 rounded-full`}>
                        {product.badge}
                      </span>
                    </div>
                  )}
                  {product.stock <= 10 && product.stock > 0 && (
                    <div className={`absolute top-4 right-4 text-white text-xs font-bold px-3 py-1.5 rounded-full ${product.stock <= 3 ? "bg-red-600 animate-pulse" : "bg-orange-500"}`}>
                      {product.stock <= 3 ? `¡Solo ${product.stock} quedan!` : "Pocas unidades"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Product Info */}
            <div className="flex flex-col gap-6">
              {/* Rating + live viewers */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < Math.floor(product.rating) ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {product.rating.toFixed(1)} ({product.reviews} reseñas)
                  </span>
                </div>
                <span className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 font-medium px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                  {viewers} personas viendo ahora
                </span>
              </div>

              {/* Title */}
              <h1 className="text-3xl lg:text-4xl font-serif font-bold text-foreground leading-tight">
                {product.name}
              </h1>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-foreground">
                  ${product.price.toLocaleString("es-CO")} COP
                </span>
                {product.original_price && (
                  <>
                    <span className="text-lg text-muted-foreground line-through">
                      ${product.original_price.toLocaleString("es-CO")}
                    </span>
                    <Badge className="bg-primary/10 text-primary border-0 font-semibold">
                      Ahorras ${savings.toLocaleString("es-CO")}
                    </Badge>
                  </>
                )}
              </div>

              {/* Fragrance notes */}
              {notes.length > 0 && (
                <div className="bg-muted/40 rounded-2xl p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Notas aromáticas
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {notes.map((note) => (
                      <span key={note} className="text-sm bg-background border border-border rounded-full px-3 py-1 text-foreground">
                        {note}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <p className="text-muted-foreground leading-relaxed">
                {product.description}
              </p>

              {/* Countdown de oferta */}
              {offerEnd && <CountdownTimer endTime={offerEnd} />}

              {/* Quantity + Add to cart */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-border rounded-xl overflow-hidden">
                    <button
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      className="px-4 py-3 hover:bg-muted transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-semibold">{qty}</span>
                    <button
                      onClick={() => setQty(Math.min(product.stock, qty + 1))}
                      className="px-4 py-3 hover:bg-muted transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {product.stock} en existencia
                  </p>
                </div>

                <Button
                  size="lg"
                  className="w-full h-14 text-base font-semibold rounded-2xl"
                  onClick={handleAdd}
                  disabled={product.stock === 0}
                >
                  {added ? (
                    <><CheckCircle className="w-5 h-5 mr-2" /> ¡Agregado al carrito!</>
                  ) : (
                    <><ShoppingBag className="w-5 h-5 mr-2" /> Agregar al carrito</>
                  )}
                </Button>

                <div className="flex gap-3">
                  <Button variant="outline" size="lg" className="flex-1 h-12 rounded-2xl">
                    <Heart className="w-4 h-4 mr-2" /> Favoritos
                  </Button>
                  <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl">
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Trust signals */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="flex flex-col items-center text-center gap-1.5 p-3 bg-muted/30 rounded-xl">
                  <Truck className="w-5 h-5 text-primary" />
                  <span className="text-xs text-muted-foreground leading-tight">Envío gratis &gt;$150k</span>
                </div>
                <div className="flex flex-col items-center text-center gap-1.5 p-3 bg-muted/30 rounded-xl">
                  <Shield className="w-5 h-5 text-primary" />
                  <span className="text-xs text-muted-foreground leading-tight">Pago 100% seguro</span>
                </div>
                <div className="flex flex-col items-center text-center gap-1.5 p-3 bg-muted/30 rounded-xl">
                  <RefreshCw className="w-5 h-5 text-primary" />
                  <span className="text-xs text-muted-foreground leading-tight">30 días garantía</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-20">
            <div className="flex border-b border-border mb-8">
              {(["descripcion", "uso", "envio"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                    activeTab === tab
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "descripcion" ? "Descripción" : tab === "uso" ? "¿Cómo usarlo?" : "Envíos"}
                </button>
              ))}
            </div>

            {activeTab === "descripcion" && (
              <div className="prose prose-sm max-w-none text-muted-foreground">
                <p className="text-base leading-relaxed mb-4">{product.description}</p>
                {isKit && (
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mt-4 flex gap-3">
                    <Gift className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground text-sm">Kit incluye:</p>
                      <p className="text-muted-foreground text-sm mt-1">Varios frascos de 250ml — aromatiza hasta 160 prendas o espacios por frasco. Ideal como regalo.</p>
                    </div>
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-4 mt-6">
                  {["Alta concentración", "No mancha", "Sin parabenos", "Hecho en Colombia"].map((feat) => (
                    <div key={feat} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-sm">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "uso" && (
              <div className="space-y-4 text-muted-foreground">
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { icon: Wind,         title: "Para espacios",  desc: "Aplica 3-5 puf en habitaciones de hasta 20m²." },
                    { icon: Shirt,        title: "Para ropa",      desc: "3 puf en prendas superiores, 5 en jeans e inferiores." },
                    { icon: Home,         title: "Duración",       desc: "Efecto olfativo hasta 8 horas en espacios cerrados." },
                    { icon: AlertTriangle,title: "Precauciones",   desc: "Evitar contacto con ojos. Alejar de menores de edad." },
                  ].map((step) => (
                    <div key={step.title} className="flex gap-3 p-4 bg-muted/30 rounded-xl">
                      <step.icon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-foreground text-sm">{step.title}</p>
                        <p className="text-sm mt-0.5">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "envio" && (
              <div className="space-y-4 text-muted-foreground">
                {[
                  { icon: Truck,    title: "Envío estándar", desc: "3–5 días hábiles. Costo según zona." },
                  { icon: Gift,     title: "Envío gratis",   desc: "En compras mayores a $300.000 COP a todo Colombia." },
                  { icon: Package,  title: "Empaque",        desc: "Embalaje protegido y sellado para garantizar la calidad." },
                  { icon: RotateCcw,title: "Devoluciones",   desc: "30 días para cambios o devoluciones sin preguntas." },
                ].map((item) => (
                  <div key={item.title} className="flex gap-3 p-4 bg-muted/30 rounded-xl">
                    <item.icon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground text-sm">{item.title}</p>
                      <p className="text-sm mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reviews */}
          <ReviewsSection productId={product.id} />

          {/* Related products */}
          {related.length > 0 && (
            <div className="mt-20">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-serif font-bold text-foreground">Los que lo compran también llevan</h2>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {related.map((p) => (
                  <div key={p.id} className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 flex flex-col">
                    <Link href={`/productos/${p.slug}`}>
                      <div className="aspect-square bg-muted/30 overflow-hidden">
                        <img
                          src={p.image_url || "/placeholder-product.jpg"}
                          alt={p.name}
                          className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    </Link>
                    <div className="p-3 flex flex-col gap-2 flex-1">
                      <p className="font-medium text-sm text-foreground line-clamp-1">{p.name}</p>
                      <p className="text-primary font-bold text-sm">
                        ${p.price.toLocaleString("es-CO")} COP
                      </p>
                      <button
                        onClick={() => addItem(p)}
                        className="mt-auto w-full py-1.5 text-xs font-semibold rounded-xl border border-primary text-primary hover:bg-primary hover:text-white transition-colors"
                      >
                        + Agregar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  )
}
