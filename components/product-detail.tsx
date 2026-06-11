"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import dynamic from "next/dynamic"
import { useCart } from "@/context/cart-context"
import { useFavorites } from "@/context/favorites-context"
import { useCAPI } from "@/lib/use-capi"
import { useSiteSettings } from "@/lib/use-site-settings"
import { parseUrgencyConfig, fillUrgency } from "@/lib/urgency"
import { getCatalogProduct } from "@/lib/catalog-data"

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
  ShoppingBag, Star, ShieldCheck, Truck, BadgeCheck,
  ChevronRight, Plus, Minus, Share2, Heart, CheckCircle,
  Wind, Shirt, Home, AlertTriangle, Package, Gift, RotateCcw,
  Timer, Check, Sparkles, Zap
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
  const { addItem, openDrawer, total, checkout, isCheckingOut } = useCart()
  const { toggleFavorite, isFavorite } = useFavorites()
  const fav = isFavorite(product.id)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [activeTab, setActiveTab] = useState<"descripcion" | "uso" | "envio">("descripcion")
  // Configuración de Urgencia Inteligente (editable desde el admin → sección Urgencia)
  const settings = useSiteSettings()
  const urgency = parseUrgencyConfig(settings.urgency_config)
  // Valor determinista para SSR (evita hydration mismatch). El número real,
  // aleatorio dentro del rango del admin, se siembra tras el montaje (efecto abajo).
  const [viewers, setViewers] = useState(12)
  // Gallery: null = show 3D render, string = show that photo URL
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  // Urgency timer — 24h from first visit (sessionStorage persists across reloads)
  const [timeLeft, setTimeLeft] = useState({ h: 23, m: 59, s: 59 })
  const countdownHours = urgency.countdown.hours
  useEffect(() => {
    // La duración (horas) la decide el admin. Si cambia, se reinicia la ventana.
    const KEY = `cliche_urgency_${product.id}_${countdownHours}`
    const stored = sessionStorage.getItem(KEY)
    const expiry = stored ? Number(stored) : Date.now() + countdownHours * 60 * 60 * 1000
    if (!stored) sessionStorage.setItem(KEY, String(expiry))
    const tick = () => {
      const diff = Math.max(0, expiry - Date.now())
      setTimeLeft({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [product.id, countdownHours])
  const pad = (n: number) => String(n).padStart(2, "0")
  // Sticky CTA — show when page scrolled past the add-to-cart button
  const [showSticky, setShowSticky] = useState(false)
  const ctaWrapRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ctaWrapRef.current) return
    const obs = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry.isIntersecting),
      { threshold: 0 }
    )
    obs.observe(ctaWrapRef.current)
    return () => obs.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const galleryImages: string[] = Array.isArray(product.image_urls) ? product.image_urls.filter(Boolean) : []
  // Share
  const [shared, setShared] = useState(false)
  // Recent purchase ghost notification
  const NAMES = ["Laura", "Valentina", "Sofía", "Camila", "Isabella", "María", "Daniela", "Juliana"]
  const CITIES = ["Bogotá", "Medellín", "Cali", "Barranquilla", "Bucaramanga", "Cartagena", "Pereira"]
  const [recentBuyer, setRecentBuyer] = useState<{ name: string; city: string } | null>(null)
  useEffect(() => {
    const show = () => {
      setRecentBuyer({
        name: NAMES[Math.floor(Math.random() * NAMES.length)],
        city: CITIES[Math.floor(Math.random() * CITIES.length)],
      })
      setTimeout(() => setRecentBuyer(null), 4000)
    }
    const initial = setTimeout(show, 6000)
    const interval = setInterval(show, 28000)
    return () => { clearTimeout(initial); clearInterval(interval) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Viewers en vivo — fluctúa cada 18s dentro del rango configurado en el admin
  const spMin = urgency.social_proof.min
  const spMax = urgency.social_proof.max
  useEffect(() => {
    // Tras el montaje (solo cliente) sembramos el número real aleatorio dentro del rango.
    setViewers(Math.max(spMin, Math.min(spMax, Math.floor(Math.random() * 16) + 7)))
    const id = setInterval(() => {
      setViewers((v) => Math.max(spMin, Math.min(spMax, v + (Math.random() > 0.45 ? 1 : -1))))
    }, 18000)
    return () => clearInterval(id)
  }, [spMin, spMax])

  // Fall-from-sky entrance — fires only once the GLB model is fully loaded
  const [fell, setFell] = useState(false)
  const handleModelReady = () => requestAnimationFrame(() => setFell(true))

  const { track } = useCAPI()

  // ViewContent — dispara cuando se carga la página del producto
  useEffect(() => {
    track({
      event_name: 'ViewContent',
      custom_data: {
        content_ids: [product.id],
        content_name: product.name,
        content_type: 'product',
        currency: 'COP',
        value: product.price,
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const catalogItem = getCatalogProduct(product.slug)
  const notes = NOTES_MAP[product.slug] || catalogItem?.notes || []
  const isKit = product.slug.startsWith("kit-")
  const savings = product.original_price ? product.original_price - product.price : 0

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : `https://cliche-nine.vercel.app/productos/${product.slug}`
    const shareData = {
      title: product.name,
      text: `Mira este aroma de Cliché: ${product.name} — ${product.description?.slice(0, 80) ?? ""}`,
      url,
    }
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share(shareData) } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url)
      setShared(true)
      setTimeout(() => setShared(false), 2500)
    }
  }

  function handleAdd() {
    // addItem ya dispara el evento AddToCart (Pixel + CAPI) una sola vez
    addItem(product, qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  function handleBuyNow() {
    addItem(product, qty)
    // ── Meta Pixel + CAPI: InitiateCheckout (compra directa) ──
    track({
      event_name: 'InitiateCheckout',
      custom_data: {
        content_ids: [product.id],
        content_name: product.name,
        content_type: 'product',
        currency: 'COP',
        value: product.price * qty,
        num_items: qty,
      },
    })
    sessionStorage.setItem("checkout-back-url", window.location.pathname + window.location.search)
    setTimeout(() => { window.location.href = "/checkout" }, 80)
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
            {/* Product Image / Gallery */}
            <div
              className="relative"
              style={{
                transform: fell ? 'translateY(0)' : 'translateY(-110vh)',
                transition: 'transform 1800ms cubic-bezier(0.0, 0.0, 0.2, 1)',
              }}
            >
              <div className="sticky top-24">
                {/* Main viewer — photo mode or 3D render */}
                <div className="relative">
                  {selectedImage ? (
                    /* Photo selected: show in a clean contained box */
                    <div className="relative aspect-square rounded-3xl overflow-hidden bg-muted/20">
                      <Image
                        src={selectedImage}
                        alt={product.name}
                        fill
                        className="object-contain p-6"
                        sizes="(max-width: 1024px) 100vw, 50vw"
                      />
                      {product.badge && (
                        <div className="absolute top-4 left-4">
                          <span className={`${product.badge_color || "bg-primary"} text-white text-xs font-bold px-3 py-1.5 rounded-full`}>
                            {product.badge}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* 3D render — exactly as original, fully transparent, badges float over it */
                    <>
                      <SprayBottle3D transparent zTilt={35 * Math.PI / 180} onReady={handleModelReady} />
                      {product.badge && (
                        <div className="absolute top-4 left-4">
                          <span className={`${product.badge_color || "bg-primary"} text-white text-xs font-bold px-3 py-1.5 rounded-full`}>
                            {product.badge}
                          </span>
                        </div>
                      )}
                      {urgency.low_stock.enabled && product.stock <= urgency.low_stock.threshold && product.stock > 0 && (
                        <div className={`absolute top-4 right-4 text-white text-xs font-bold px-3 py-1.5 rounded-full ${product.stock <= 3 ? "bg-red-600 animate-pulse" : "bg-orange-500"}`}>
                          {fillUrgency(urgency.low_stock.message, { stock: product.stock })}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Thumbnail strip — only visible after the render has landed */}
                <div
                  className="flex gap-2 overflow-x-auto pb-1 mt-4"
                  style={{
                    opacity: fell ? 1 : 0,
                    transform: fell ? 'translateY(0)' : 'translateY(8px)',
                    transition: 'opacity 500ms ease 200ms, transform 500ms ease 200ms',
                  }}
                >
                  {/* 3D render thumbnail */}
                  <button
                    onClick={() => setSelectedImage(null)}
                    className={`flex-shrink-0 w-16 h-16 rounded-xl border-2 bg-muted/40 flex items-center justify-center transition-all ${
                      selectedImage === null ? "border-primary shadow-md" : "border-border hover:border-primary/50"
                    }`}
                    title="Ver vista 3D"
                  >
                    <span className="text-[10px] font-bold text-muted-foreground text-center leading-tight px-1">Vista<br/>3D</span>
                  </button>

                  {/* Admin photos or blank placeholders */}
                  {galleryImages.length > 0
                    ? galleryImages.map((url, i) => (
                        <button
                          key={url}
                          onClick={() => setSelectedImage(url)}
                          className={`flex-shrink-0 w-16 h-16 rounded-xl border-2 overflow-hidden transition-all ${
                            selectedImage === url ? "border-primary shadow-md" : "border-border hover:border-primary/50"
                          }`}
                        >
                          <img src={url} alt={`Imagen ${i + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))
                    : [1, 2, 3].map((n) => (
                        <div
                          key={n}
                          className="flex-shrink-0 w-16 h-16 rounded-xl border-2 border-dashed border-border bg-muted/20 flex items-center justify-center"
                        >
                          <span className="text-[9px] text-muted-foreground/50 text-center leading-tight">Foto<br/>pronto</span>
                        </div>
                      ))
                  }
                </div>
              </div>
            </div>

            {/* Product Info */}
            <div
              className="flex flex-col gap-6"
              style={{
                opacity: fell ? 1 : 0,
                transform: fell ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 600ms ease 300ms, transform 600ms ease 300ms',
              }}
            >
              {/* Live viewers — prueba social en vivo (configurable en admin → Urgencia) */}
              {urgency.social_proof.enabled && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 font-medium px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                    {fillUrgency(urgency.social_proof.message, { n: viewers })}
                  </span>
                </div>
              )}

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

              {/* Urgency timer — oferta por tiempo limitado (configurable en admin → Urgencia) */}
              {urgency.countdown.enabled && product.original_price && (
                <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3">
                  <Timer className="w-5 h-5 text-orange-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">{urgency.countdown.headline}</p>
                    <p className="text-xs text-orange-600 mt-0.5">{urgency.countdown.message}{" "}
                      <span className="font-mono font-bold text-orange-800">{pad(timeLeft.h)}:{pad(timeLeft.m)}:{pad(timeLeft.s)}</span>
                    </p>
                  </div>
                  <span className="text-xs font-bold text-orange-700 bg-orange-100 px-2 py-1 rounded-lg">
                    -{Math.round((1 - product.price / product.original_price) * 100)}%
                  </span>
                </div>
              )}

              {/* Free shipping progress bar — only shown when cart has items */}
              {(() => {
                const FREE_SHIPPING = 300000
                const cartTotal = total // total from useCart(), in COP
                if (cartTotal <= 0) return null
                const pct = Math.min(100, Math.round((cartTotal / FREE_SHIPPING) * 100))
                const remaining = FREE_SHIPPING - cartTotal
                return (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {remaining > 0
                          ? <>Te faltan <strong className="text-foreground">${remaining.toLocaleString("es-CO")}</strong> para envío gratis</>
                          : <span className="text-green-600 font-semibold flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5" />
                              ¡Tu pedido tiene envío gratis!
                            </span>
                        }
                      </span>
                      <span className="text-muted-foreground font-medium">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-green-500 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })()}

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
                {VALUE_MAP[product.slug] || catalogItem?.description || product.description}
              </p>

              {/* ¿Para quién es este aroma? — mercado recomendado del catálogo */}
              {catalogItem?.recommendedFor && (
                <div className="border-l-2 border-primary/60 bg-secondary/50 px-5 py-4">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-primary mb-1.5">
                    Ideal para
                  </p>
                  <p className="font-serif text-base text-foreground leading-snug">
                    {catalogItem.recommendedFor}
                  </p>
                  {catalogItem.tagline && (
                    <p className="mt-1.5 text-sm italic text-muted-foreground">
                      “{catalogItem.tagline}”
                    </p>
                  )}
                </div>
              )}

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

                <div ref={ctaWrapRef} className="space-y-3">
                  <Button
                    size="lg"
                    data-heat="Agregar al carrito"
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
                  <Button
                    size="lg"
                    variant="outline"
                    data-heat="Comprar ahora"
                    className="w-full h-12 text-sm font-semibold rounded-2xl border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={handleBuyNow}
                    disabled={product.stock === 0 || isCheckingOut}
                  >
                    {isCheckingOut ? (
                      <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" /> Procesando...</>
                    ) : (
                      <><Zap className="w-4 h-4 mr-2" /> Comprar ahora</>
                    )}
                  </Button>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    className={`flex-1 h-12 rounded-2xl transition-colors ${fav ? "border-red-300 bg-red-50 text-red-600 hover:bg-red-100" : ""}`}
                    onClick={() => toggleFavorite(product)}
                  >
                    <Heart className={`w-4 h-4 mr-2 transition-all ${fav ? "fill-red-500 text-red-500 scale-110" : ""}`} />
                    {fav ? "Guardado" : "Favoritos"}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className={`h-12 w-12 rounded-2xl transition-colors ${shared ? "border-green-400 bg-green-50 text-green-600" : ""}`}
                    onClick={handleShare}
                    title={shared ? "¡Link copiado!" : "Compartir"}
                  >
                    {shared
                      ? <CheckCircle className="w-4 h-4 text-green-600" />
                      : <Share2 className="w-4 h-4" />
                    }
                  </Button>
                </div>

                {/* Shared toast */}
                {shared && (
                  <p className="text-xs text-center text-green-600 font-medium flex items-center justify-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Link copiado al portapapeles
                  </p>
                )}
              </div>

              {/* Trust signals — animated (keyframes in globals.css) */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="flex flex-col items-center text-center gap-1.5 p-3 bg-muted/30 rounded-xl">
                  <Truck className="w-6 h-6 text-primary trust-truck" />
                  <span className="text-xs text-muted-foreground leading-tight font-medium">Envío gratis &gt;$300k</span>
                </div>
                <div className="flex flex-col items-center text-center gap-1.5 p-3 bg-muted/30 rounded-xl">
                  <ShieldCheck className="w-6 h-6 text-primary trust-shield" />
                  <span className="text-xs text-muted-foreground leading-tight font-medium">Pago 100% seguro</span>
                </div>
                <div className="flex flex-col items-center text-center gap-1.5 p-3 bg-muted/30 rounded-xl">
                  <BadgeCheck className="w-6 h-6 text-primary trust-badge" />
                  <span className="text-xs text-muted-foreground leading-tight font-medium">30 días garantía</span>
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
                <p className="text-base leading-relaxed mb-4">{VALUE_MAP[product.slug] || catalogItem?.description || product.description}</p>
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

      {/* Sticky CTA bar — aparece en todas las pantallas al perder de vista el CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 transition-all duration-300"
        style={{
          transform: showSticky ? 'translateY(0)' : 'translateY(100%)',
          opacity: showSticky ? 1 : 0,
        }}
      >
        <div className="bg-card border-t border-border shadow-2xl px-4 py-3 flex items-center gap-3 lg:px-10">
          <div className="hidden lg:block h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-muted/30">
            <img src={product.image_url || "/placeholder-product.jpg"} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate lg:font-serif lg:text-sm lg:text-foreground">{product.name}</p>
            <p className="font-bold text-foreground text-sm">${product.price.toLocaleString("es-CO")} COP</p>
          </div>
          <Button
            size="sm"
            className="flex-shrink-0 h-11 px-6 rounded-xl font-semibold"
            onClick={() => { handleAdd(); setTimeout(() => openDrawer(), 300) }}
            disabled={product.stock === 0}
          >
            {added ? <CheckCircle className="w-4 h-4 mr-1" /> : <ShoppingBag className="w-4 h-4 mr-1" />}
            {added ? "¡Agregado!" : "Agregar"}
          </Button>
        </div>
      </div>

      {/* Recent buyer notification — premium social proof toast */}
      <div
        className="fixed bottom-24 left-4 z-50 transition-all duration-500"
        style={{
          opacity: recentBuyer ? 1 : 0,
          transform: recentBuyer ? 'translateY(0)' : 'translateY(12px)',
          pointerEvents: 'none',
        }}
      >
        <div className="bg-white border border-border/60 rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 max-w-[260px]"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.10)' }}
        >
          {/* Icon */}
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="w-4 h-4 text-primary" />
          </div>
          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground leading-tight truncate">
              {recentBuyer?.name} · {recentBuyer?.city}
            </p>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
              Acaba de adquirir este producto
            </p>
          </div>
          {/* Verified dot */}
          <div className="flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-green-500 ring-2 ring-green-500/20" />
          </div>
        </div>
      </div>
    </>
  )
}
