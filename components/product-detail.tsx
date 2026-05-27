"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import dynamic from "next/dynamic"
import { useCart } from "@/context/cart-context"

const SprayBottle3D = dynamic(
  () => import("@/components/spray-bottle-3d").then((m) => m.SprayBottle3D),
  { ssr: false, loading: () => (
    <div className="relative aspect-square bg-muted/30 rounded-3xl overflow-hidden flex items-center justify-center">
      <div className="w-16 h-16 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
    </div>
  )}
)
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

const VALUE_MAP: Record<string, string> = {
  "aroma-agua":               "Transforma tu dormitorio en un oasis de calma. Su frescura acuática disuelve el estrés del día y te invita a descansar de verdad. Ideal para aplicar en sábanas antes de dormir o para refrescar baños y cocinas en segundos.",
  "aroma-aire":               "Renueva cualquier espacio al instante. Perfecto para oficinas, salas o habitaciones que necesitan sensación de amplitud. Una sola aplicación y tu hogar respira diferente — sin velas, sin difusores.",
  "aroma-tierra":             "Ancla tu hogar con calidez y profundidad. Su base de pachulí y cedro convierte cualquier espacio en un refugio íntimo. Ideal para crear ambiente de meditación, lectura o trabajo enfocado.",
  "aroma-fuego":              "Crea una atmósfera que enamora. Canela y ámbar llenan el hogar de una calidez que hace que todos quieran quedarse. Perfecto para noches de invierno, reuniones íntimas o cuando quieres que tu casa se sienta como un abrazo.",
  "aroma-vientos-de-lino":    "El aroma que hace que la ropa siempre huela a recién lavada. Fresco, limpio y reconfortante. Aplícalo en sábanas, toallas y almohadas — cada mañana empieza bien cuando el entorno huele así.",
  "aroma-frescura-de-lino":   "Limpieza olfativa instantánea para cualquier rincón del hogar. Sin artificios, solo frescura real. Perfecto para ropa de cama, closets y espacios de trabajo donde necesitas claridad mental.",
  "aroma-tao":                "Lleva la serenidad del spa a tu hogar. El sándalo y el agua de rosas crean equilibrio y paz interior. Ideal para yoga, meditación o simplemente desconectarte después de un día agitado.",
  "aroma-mahai":              "Cierra los ojos y siente la brisa tropical. Coco, vainilla y flor de tiaré te transportan a la playa en segundos. Úsalo cuando necesitas escapar mentalmente sin salir de casa.",
  "aroma-calor-de-lana":      "El aroma del bienestar puro. Cachemir y vainilla que recuerdan las mejores tardes de invierno: cobija, libro y taza de té. Ponlo en la sala o el cuarto y automáticamente sientes que todo está bien.",
  "aroma-dulce-lana":         "Suavidad que se huele. Ámbar dorado y vainilla que hacen del hogar un espacio acogedor desde el momento en que cruzas la puerta. Transforma habitaciones frías en rincones de confort real.",
  "aroma-crema":              "Envuelve tu hogar en dulzura. Vainilla cremosa y leche de almendra crean una atmósfera reconfortante, ideal para habitaciones, momentos de autocuidado y para acompañar el descanso nocturno.",
  "aroma-luxury":             "La presencia de un perfume de lujo en cada rincón de tu hogar. El oud árabe y las especias exóticas crean elegancia que impresiona desde que tus visitas cruzan la puerta. Para quienes no se conforman con lo ordinario.",
  "aroma-romeo-y-julieta":    "Convierte cualquier momento en una historia de amor. Rosa y jazmín llenan el ambiente de romanticismo genuino. Ideal para cenas especiales, veladas íntimas o para recordarle a tu pareja lo especial que es cada día.",
  "aroma-indigo-profundo":    "Profundidad aromática que transforma el estado de ánimo. Lavanda y violeta con base de cedro oscuro: relajación real sin pastillas. Perfecto para la hora de dormir o para crear un espacio de introspección.",
  "aroma-eternamente-indigo": "Un aroma que perdura en la memoria. Iris azul y violeta intensa que dejan huella en quien visita tu hogar. Para espacios donde quieres que la experiencia sea inolvidable.",
  "aroma-hilos-de-seda":      "Delicadeza que se percibe antes de entrar. Seda blanca y polvos suaves que hacen que el hogar transmita cuidado y refinamiento. Ideal para dormitorios principales y espacios personales.",
  "aroma-brillos-de-seda":    "Luminosidad aromática que eleva cualquier espacio. Flores blancas y seda natural aportan elegancia sutil — ese detalle que convierte una habitación corriente en un lugar especial.",
  "aroma-sello-de-dios":      "Incienso, mirra y madera sagrada para quienes buscan algo más que un aroma. Purifica el ambiente, calma la mente y crea un espacio de conexión y silencio interior. Para momentos que merecen ser sagrados.",
  "aroma-lycra-de-verano":    "Energía y vitalidad en cada aplicación. Cítricos vibrantes y sal marina para despertar el hogar y tu estado de ánimo a la vez. Ideal para mañanas, espacios deportivos o cualquier momento que necesita un impulso.",
  "aroma-navidad":            "La magia de la Navidad sin fecha de caducidad. Pino, canela y naranja especiada para recrear esa atmósfera única de diciembre en cualquier momento del año. El aroma que activa recuerdos felices al instante.",
  "aroma-best-friends":       "Alegría en cada rincón. Frambuesa, flores dulces y azúcar crean un ambiente juguetón y cálido que contagia buen humor. Perfecto para espacios familiares, cuartos de niños y reuniones donde quieres que todos sonrían.",
  "aroma-happiness":          "El aroma de los días perfectos. Cítricos alegres y flores de primavera que elevan el ánimo de forma inmediata. Para cuando quieres que tu hogar tenga la energía de un buen día, todos los días.",
}

export function ProductDetail({ product, related }: Props) {
  const { addItem } = useCart()
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [activeTab, setActiveTab] = useState<"descripcion" | "uso" | "envio">("descripcion")
  const [viewers, setViewers] = useState(() => Math.floor(Math.random() * 16) + 7)

  // Viewers en vivo — fluctúa cada 18s
  useEffect(() => {
    const id = setInterval(() => {
      setViewers((v) => Math.max(4, Math.min(28, v + (Math.random() > 0.45 ? 1 : -1))))
    }, 18000)
    return () => clearInterval(id)
  }, [])

  // Entrance animations per product
  const ANIM_SLUGS: Record<string, 'A' | 'B' | 'C'> = {
    'aroma-agua':   'A',
    'aroma-aire':   'B',
    'aroma-tierra': 'C',
  }
  const animType = ANIM_SLUGS[product.slug] ?? null
  const [animActive, setAnimActive] = useState(false)
  // Option A specific phases
  const [heroPhase, setHeroPhase] = useState<'hero' | 'settling' | 'done'>('hero')

  useEffect(() => {
    if (!animType) { setAnimActive(true); return }
    if (animType === 'B') {
      const t = setTimeout(() => setAnimActive(true), 60)
      return () => clearTimeout(t)
    }
    if (animType === 'C') {
      const t = setTimeout(() => setAnimActive(true), 1000)
      return () => clearTimeout(t)
    }
    // Option A: 3s hero → 1.2s fade out → grid appears
    if (animType === 'A') {
      const t1 = setTimeout(() => setHeroPhase('settling'), 3000)
      const t2 = setTimeout(() => { setHeroPhase('done'); setAnimActive(true) }, 4300)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
  }, [])

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
        {/* Option A: cinematic hero overlay — product centered, tilted, rotating */}
        {animType === 'A' && heroPhase !== 'done' && (
          <>
            {/* Dark backdrop */}
            <div
              className="fixed inset-0 pointer-events-none"
              style={{
                zIndex: 55,
                background: 'rgba(8, 4, 2, 0.93)',
                opacity: heroPhase === 'settling' ? 0 : 1,
                transition: 'opacity 1200ms ease',
              }}
            />
            {/* Centered product viewer */}
            <div
              className="fixed inset-0 flex flex-col items-center justify-center pointer-events-none"
              style={{
                zIndex: 60,
                opacity: heroPhase === 'settling' ? 0 : 1,
                transition: 'opacity 1000ms ease 100ms',
              }}
            >
              <div style={{
                width: 'min(62vmin, 420px)',
                height: 'min(62vmin, 420px)',
                transform: 'perspective(1400px) rotateX(7deg) rotateY(-16deg)',
                filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.6))',
              }}>
                <SprayBottle3D />
              </div>
              <p
                className="text-white/40 text-xs tracking-[0.35em] uppercase mt-6"
                style={{ fontFamily: 'serif' }}
              >
                {product.name}
              </p>
            </div>
          </>
        )}
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
          <div
            className="grid lg:grid-cols-2 gap-12 mb-20"
            style={animType === 'C' ? { overflow: 'hidden' } : {}}
          >
            {/* Product Image */}
            <div
              className="relative"
              style={
                animType === 'A' ? {
                  opacity: animActive ? 1 : 0,
                  transition: 'opacity 700ms ease',
                } :
                animType === 'B' ? {
                  transform: animActive ? 'translateY(0)' : 'translateY(-90px)',
                  opacity: animActive ? 1 : 0,
                  transition: 'transform 560ms cubic-bezier(0.16,1,0.3,1), opacity 420ms ease',
                } : {}
              }
            >
              <div className="sticky top-24">
                <div className="relative">
                  <SprayBottle3D />
                  {product.badge && (
                    <div className="absolute top-4 left-4">
                      <span className={`${product.badge_color || "bg-primary"} text-white text-xs font-bold px-3 py-1.5 rounded-full`}>
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
            <div
              className="flex flex-col gap-6"
              style={
                animType === 'A' ? {
                  opacity: animActive ? 1 : 0,
                  transform: animActive ? 'translateY(0)' : 'translateY(24px)',
                  transition: 'opacity 600ms ease 350ms, transform 600ms ease 350ms',
                } :
                animType === 'B' ? {
                  transform: animActive ? 'translateY(0)' : 'translateY(-65px)',
                  opacity: animActive ? 1 : 0,
                  transition: 'transform 560ms cubic-bezier(0.16,1,0.3,1) 200ms, opacity 420ms ease 200ms',
                } :
                animType === 'C' ? {
                  transform: animActive ? 'translateX(0)' : 'translateX(110%)',
                  opacity: animActive ? 1 : 0,
                  transition: 'transform 720ms cubic-bezier(0.16,1,0.3,1), opacity 500ms ease 100ms',
                } : {}
              }
            >
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
                {VALUE_MAP[product.slug] || product.description}
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
                <p className="text-base leading-relaxed mb-4">{VALUE_MAP[product.slug] || product.description}</p>
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
