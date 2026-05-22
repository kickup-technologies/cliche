"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useCart } from "@/context/cart-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ShoppingBag, Star, Shield, Truck, RefreshCw,
  ChevronRight, Plus, Minus, Share2, Heart, CheckCircle
} from "lucide-react"
import type { Product } from "@/lib/supabase"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { WhatsAppButton } from "@/components/whatsapp-button"

interface Props {
  product: Product
  related: Product[]
}

const NOTES_MAP: Record<string, string[]> = {
  "aroma-agua":          ["Bergamota Italia", "Lirio Acuático", "Cáscara de Lima"],
  "aroma-aire":          ["Musgo Blanco", "Bambú Verde", "Almizcle Fresco"],
  "aroma-tierra":        ["Pachulí", "Cedro Virginia", "Vetiver"],
  "aroma-fuego":         ["Canela", "Vainilla Bourbon", "Sándalo"],
  "aroma-brillos-seda":  ["Seda", "Flores Blancas", "Almizcle Suave"],
  "aroma-indigo-profundo": ["Lavanda", "Iris Azul", "Madera Oscura"],
}

export function ProductDetail({ product, related }: Props) {
  const { addItem } = useCart()
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [activeTab, setActiveTab] = useState<"descripcion" | "uso" | "envio">("descripcion")

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
                  {product.stock <= 5 && product.stock > 0 && (
                    <div className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full animate-pulse">
                      ¡Solo {product.stock} disponibles!
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Product Info */}
            <div className="flex flex-col gap-6">
              {/* Rating */}
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
                    <Badge className="bg-green-100 text-green-700 border-0">
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
                      <span key={note} className="text-sm bg-background border border-border rounded-full px-3 py-1">
                        🌿 {note}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <p className="text-muted-foreground leading-relaxed">
                {product.description}
              </p>

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
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mt-4">
                    <p className="font-semibold text-amber-800">🎁 Kit incluye:</p>
                    <p className="text-amber-700 mt-1">Varios frascos de 250ml — aromatiza hasta 160 prendas o espacios por frasco. Ideal como regalo.</p>
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
                    { icon: "💨", title: "Para espacios", desc: "Aplica 3-5 puf en habitaciones de hasta 20m²." },
                    { icon: "👕", title: "Para ropa", desc: "3 puf en prendas superiores, 5 en jeans e inferiores." },
                    { icon: "🏠", title: "Duración", desc: "Efecto olfativo hasta 8 horas en espacios cerrados." },
                    { icon: "⚠️", title: "Precauciones", desc: "Evitar contacto con ojos. Alejar de menores de edad." },
                  ].map((step) => (
                    <div key={step.title} className="flex gap-3 p-4 bg-muted/30 rounded-xl">
                      <span className="text-2xl">{step.icon}</span>
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
                  { icon: "🚚", title: "Envío estándar", desc: "3–5 días hábiles. Costo según zona." },
                  { icon: "🎁", title: "Envío gratis", desc: "En compras mayores a $150.000 COP a todo Colombia." },
                  { icon: "📦", title: "Empaque", desc: "Embalaje protegido y sellado para garantizar la calidad." },
                  { icon: "🔄", title: "Devoluciones", desc: "30 días para cambios o devoluciones sin preguntas." },
                ].map((item) => (
                  <div key={item.title} className="flex gap-3 p-4 bg-muted/30 rounded-xl">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{item.title}</p>
                      <p className="text-sm mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Related products */}
          {related.length > 0 && (
            <div>
              <h2 className="text-2xl font-serif font-bold text-foreground mb-8">También te puede gustar</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {related.map((p) => (
                  <Link
                    key={p.id}
                    href={`/productos/${p.slug}`}
                    className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1"
                  >
                    <div className="aspect-square bg-muted/30 overflow-hidden">
                      <img
                        src={p.image_url || "/placeholder-product.jpg"}
                        alt={p.name}
                        className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-3">
                      <p className="font-medium text-sm text-foreground line-clamp-1">{p.name}</p>
                      <p className="text-primary font-bold text-sm mt-1">
                        ${p.price.toLocaleString("es-CO")} COP
                      </p>
                    </div>
                  </Link>
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
