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

// Visor del modelo 3D real (GLB de Meshy) para los productos que ya lo tienen.
const MeshyViewer = dynamic(
  () => import("@/components/meshy-viewer").then((m) => m.MeshyViewer),
  { ssr: false, loading: () => (
    <div className="relative aspect-square bg-muted/30 rounded-3xl overflow-hidden flex items-center justify-center">
      <div className="w-16 h-16 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
    </div>
  )}
)

// slug (sin prefijo "aroma-") → modelo 3D real disponible.
const PRODUCT_MODELS: Record<string, string> = {
  "calor-de-lana": "/models/calor-de-lana.glb",
  "coconut": "/models/coconut.glb",
  "watermelon": "/models/watermelon.glb",
  "air-fresh": "/models/air-fresh.glb",
  "tao": "/models/tao.glb",
  "romeo-y-julieta": "/models/romeo-y-julieta.glb",
  "frescura-de-lino": "/models/frescura-de-lino.glb",
  "seda-del-lejano-oriente": "/models/seda-del-lejano-oriente.glb",
  "luxury": "/models/luxury.glb",
  "hilos-de-seda": "/models/hilos-de-seda.glb",
  "indigo-profundo": "/models/indigo-profundo.glb",
  "tierra": "/models/tierra.glb",
  "agua": "/models/agua.glb",
  "aire": "/models/aire.glb",
  "best-friends": "/models/best-friends.glb",
  "lycra-de-verano": "/models/lycra-de-verano.glb",
  "mahai": "/models/mahai.glb",
  "dulce-lana": "/models/dulce-lana.glb",
  "vientos-de-lino": "/models/vientos-de-lino.glb",
  "eternamente-indigo": "/models/eternamente-indigo.glb",
  "sello-de-dios": "/models/sello-de-dios.glb",
  "brillos-seda": "/models/brillos-de-seda.glb",
  "happiness": "/models/happiness.glb",
  "navidad": "/models/navidad.glb",
}
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
import { ProductRecommendations } from "@/components/product-recommendations"
import { recordView } from "@/lib/recently-viewed"
import { useReviewStats } from "@/lib/use-review-stats"
import { PRICE_TIERS, TIER_BY_ID, UNIT_PRICE, makeVariantId, tierSavings } from "@/lib/pricing"

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
  "aroma-coconut":           ["Coco", "Almendra", "Piña", "Tonka", "Almizcle"],
  "aroma-watermelon":        ["Sandía", "Candy Dulce"],
  "aroma-air-fresh":         ["Notas Limpias", "Frescor Neutro"],
  "aroma-seda-del-lejano-oriente": ["Vainilla", "Cedro", "Almizcle", "Cardamomo"],
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
  // Rating y conteo unificados (semilla + reales) — misma fuente que la sección
  const reviewStats = useReviewStats(product.id)
  const [qty, setQty] = useState(1)
  // Tier de compra: unidad / kit x3 / x4 / x6 (mismo aroma)
  const [tierId, setTierId] = useState("unit")
  const tier = TIER_BY_ID[tierId] ?? TIER_BY_ID["unit"]
  const maxQty = Math.max(1, Math.floor(product.stock / tier.units))
  useEffect(() => { setQty((q) => Math.min(q, maxQty)) }, [maxQty])
  const [added, setAdded] = useState(false)
  // Acordeón de info — qué sección está abierta (una a la vez; null = todas cerradas por defecto)
  const [openSection, setOpenSection] = useState<string | null>(null)
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

  // Entrada inmediata: la página NO espera al 3D (antes solo entraba cuando el
  // GLB terminaba de cargar → se sentía trabada al abrir un producto). Ahora
  // entra de una y el visor 3D carga en segundo plano y aparece cuando está listo.
  const [fell, setFell] = useState(false)
  const handleModelReady = () => setFell(true)
  useEffect(() => {
    const t = setTimeout(() => setFell(true), 60)
    return () => clearTimeout(t)
  }, [])

  const { track } = useCAPI()

  // ViewContent — dispara cuando se carga la página del producto.
  // Además registra el producto en el historial "Vistos recientemente".
  useEffect(() => {
    recordView(product)
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

  // Producto "variante" según el tier elegido — id, nombre y precio del kit.
  // El unitario conserva el id real; los kits usan id::tier (el checkout lo parsea).
  function buildVariant(): Product {
    return {
      ...product,
      id: makeVariantId(product.id, tier.id),
      name: tier.units > 1 ? `${product.name} — Kit x${tier.units}` : product.name,
      price: tier.price,
    }
  }

  function handleAdd() {
    // addItem ya dispara el evento AddToCart (Pixel + CAPI) una sola vez
    addItem(buildVariant(), qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  function handleBuyNow() {
    addItem(buildVariant(), qty)
    // ── Meta Pixel + CAPI: InitiateCheckout (compra directa) ──
    track({
      event_name: 'InitiateCheckout',
      custom_data: {
        content_ids: [product.id],
        content_name: product.name,
        content_type: 'product',
        currency: 'COP',
        value: tier.price * qty,
        num_items: qty * tier.units,
      },
    })
    sessionStorage.setItem("checkout-back-url", window.location.pathname + window.location.search)
    setTimeout(() => { window.location.href = "/checkout" }, 80)
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-28 pb-24">
        {/* Breadcrumb */}
        <div className="container mx-auto px-4 sm:px-6 mb-8">
          <nav className="flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] text-muted-foreground/70">
            <Link href="/" className="hover:text-primary transition-colors">Inicio</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/catalogo" className="hover:text-primary transition-colors">Aromas</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground/80 truncate max-w-[200px] normal-case tracking-normal">{product.name}</span>
          </nav>
        </div>

        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-20 items-start mb-24 lg:mb-28">
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
    /* 3D render — modelo real (Meshy) si existe, si no el genérico */
                    <>
                      {PRODUCT_MODELS[product.slug.replace(/^aroma-/, "")] ? (
                        <MeshyViewer url={PRODUCT_MODELS[product.slug.replace(/^aroma-/, "")]} onReady={handleModelReady} />
                      ) : (
                        <SprayBottle3D transparent zTilt={0} onReady={handleModelReady} labelPhoto={product.image_url || undefined} flatLabel={`/labels/${product.slug}.png`} />
                      )}
                      {product.badge && (
                        <div className="absolute top-4 left-4">
                          <span className={`${product.badge_color || "bg-primary"} text-white text-xs font-bold px-3 py-1.5 rounded-full`}>
                            {product.badge}
                          </span>
                        </div>
                      )}
                      {urgency.low_stock.enabled && product.stock <= urgency.low_stock.threshold && product.stock > 0 && (
                        <div className="absolute top-4 right-4 text-[11px] font-medium tracking-wide text-foreground/80 bg-background/80 backdrop-blur-sm border border-foreground/10 px-3 py-1.5 rounded-full">
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
              className="flex flex-col gap-7 lg:pt-2"
              style={{
                opacity: fell ? 1 : 0,
                transform: fell ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 600ms ease 300ms, transform 600ms ease 300ms',
              }}
            >
              {/* Live viewers — prueba social, discreta */}
              {urgency.social_proof.enabled && (
                <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] text-muted-foreground/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                  {fillUrgency(urgency.social_proof.message, { n: viewers })}
                </p>
              )}

              {/* Title */}
              <h1 className="font-serif text-[2rem] lg:text-[2.75rem] font-bold text-foreground leading-[1.08] tracking-tight">
                {product.name}
              </h1>

              {/* Rating — unificado con la sección de reseñas */}
              {reviewStats.count > 0 && (
                <a href="#resenas" className="flex items-center gap-2 -mt-1 group">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${i <= Math.round(reviewStats.avg) ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                    {reviewStats.avg.toFixed(1)} · {reviewStats.count} reseña{reviewStats.count !== 1 ? "s" : ""}
                  </span>
                </a>
              )}

              {/* Notas aromáticas — teaser olfativo bajo el título */}
              {notes.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 -mt-1">
                  <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">Notas</span>
                  {notes.map((note) => (
                    <span key={note} className="rounded-full border border-foreground/[0.06] bg-secondary/50 px-3 py-1 text-[12px] text-foreground/75">
                      {note}
                    </span>
                  ))}
                </div>
              )}

              {/* Price — según el tier seleccionado */}
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-[2.15rem] font-semibold text-foreground tracking-tight leading-none">
                  ${tier.price.toLocaleString("es-CO")}
                  <span className="text-sm font-normal text-muted-foreground ml-1.5">COP</span>
                </span>
                {tier.units > 1 ? (
                  <>
                    <span className="text-base text-muted-foreground/70 line-through">
                      ${(tier.units * UNIT_PRICE).toLocaleString("es-CO")}
                    </span>
                    <span className="text-xs font-medium text-primary bg-primary/8 border border-primary/15 rounded-full px-2.5 py-0.5">
                      Ahorras ${tierSavings(tier).toLocaleString("es-CO")}
                    </span>
                  </>
                ) : product.original_price ? (
                  <>
                    <span className="text-base text-muted-foreground/70 line-through">
                      ${product.original_price.toLocaleString("es-CO")}
                    </span>
                    <span className="text-xs font-medium text-primary bg-primary/8 border border-primary/15 rounded-full px-2.5 py-0.5">
                      Ahorras ${savings.toLocaleString("es-CO")}
                    </span>
                  </>
                ) : null}
              </div>

              {/* Selector de presentación — unidad o kit (mismo aroma) */}
              <div>
                <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                  Presentación
                </p>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {PRICE_TIERS.map((t) => {
                    const active = t.id === tierId
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTierId(t.id)}
                        className={`relative flex flex-col items-start rounded-xl border px-3 py-2.5 text-left transition-all ${
                          active
                            ? "border-primary bg-primary/[0.06] ring-1 ring-primary/30"
                            : "border-foreground/12 hover:border-foreground/30"
                        }`}
                      >
                        {t.badge && (
                          <span className="absolute -top-2 right-2 rounded-full bg-foreground px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-background">
                            {t.badge}
                          </span>
                        )}
                        <span className={`text-[13px] font-semibold ${active ? "text-primary" : "text-foreground"}`}>{t.label}</span>
                        <span className="mt-0.5 text-[13px] text-foreground/80">${t.price.toLocaleString("es-CO")}</span>
                        {t.units > 1 && (
                          <span className="text-[10px] text-muted-foreground">${Math.round(t.price / t.units).toLocaleString("es-CO")} c/u</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Urgency timer — oferta por tiempo limitado (configurable en admin → Urgencia) */}
              {urgency.countdown.enabled && product.original_price && (
                <div className="flex items-center gap-3 bg-secondary/60 border border-primary/15 rounded-2xl px-4 py-3">
                  <Timer className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-[11px] font-semibold text-foreground/80 uppercase tracking-[0.12em]">{urgency.countdown.headline}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{urgency.countdown.message}{" "}
                      <span className="font-mono font-semibold text-foreground">{pad(timeLeft.h)}:{pad(timeLeft.m)}:{pad(timeLeft.s)}</span>
                    </p>
                  </div>
                  <span className="text-xs font-medium text-foreground/60 bg-foreground/[0.05] border border-foreground/10 px-2.5 py-1 rounded-lg">
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
                          : <span className="text-primary font-semibold flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5" />
                              ¡Tu pedido tiene envío gratis!
                            </span>
                        }
                      </span>
                      <span className="text-muted-foreground font-medium">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-foreground/[0.07] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })()}

              {/* Description */}
              <p className="text-[15px] text-muted-foreground leading-[1.75]">
                {catalogItem?.description || VALUE_MAP[product.slug] || product.description}
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
              <div className="space-y-4 border-t border-foreground/[0.06] pt-6">
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
                      onClick={() => setQty(Math.min(maxQty, qty + 1))}
                      className="px-4 py-3 hover:bg-muted transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {tier.units > 1
                      ? `${qty} kit${qty !== 1 ? "s" : ""} · ${qty * tier.units} frascos`
                      : `${product.stock} en existencia`}
                  </p>
                </div>

                <div ref={ctaWrapRef} className="space-y-3">
                  <Button
                    size="lg"
                    data-heat="Agregar al carrito"
                    className="w-full h-14 text-[15px] font-semibold rounded-xl transition-all active:scale-[0.99]"
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
                    className="w-full h-12 text-sm font-medium rounded-xl border-foreground/20 text-foreground hover:bg-foreground hover:text-background transition-colors"
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

                {/* Acciones secundarias — discretas, estilo editorial */}
                <div className="flex items-center gap-6 pt-1">
                  <button
                    onClick={() => toggleFavorite(product)}
                    className={`flex items-center gap-2 text-sm transition-colors ${fav ? "text-red-500" : "text-foreground/55 hover:text-foreground"}`}
                  >
                    <Heart className={`w-4 h-4 transition-all ${fav ? "fill-red-500 text-red-500 scale-110" : ""}`} />
                    {fav ? "Guardado en favoritos" : "Añadir a favoritos"}
                  </button>
                  <button
                    onClick={handleShare}
                    className={`flex items-center gap-2 text-sm transition-colors ${shared ? "text-primary" : "text-foreground/55 hover:text-foreground"}`}
                    title={shared ? "¡Link copiado!" : "Compartir"}
                  >
                    {shared ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                    {shared ? "Link copiado" : "Compartir"}
                  </button>
                </div>
              </div>

              {/* Trust signals — fila refinada con divisores */}
              <div className="grid grid-cols-3 pt-5 mt-1 border-t border-foreground/[0.06] divide-x divide-foreground/[0.06]">
                {[
                  { Icon: Truck, label: "Envío gratis +$300k", cls: "trust-truck" },
                  { Icon: ShieldCheck, label: "Pago 100% seguro", cls: "trust-shield" },
                  { Icon: BadgeCheck, label: "30 días garantía", cls: "trust-badge" },
                ].map(({ Icon, label, cls }) => (
                  <div key={label} className="flex flex-col items-center text-center gap-2 px-2 py-1">
                    <Icon className={`w-[18px] h-[18px] text-primary ${cls}`} />
                    <span className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground leading-tight">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Info en acordeón — cada botón guarda/despliega su contenido (ancho completo) */}
          <div className="w-full mb-20">
            {[
              {
                id: "descripcion",
                label: "Descripción",
                Icon: Sparkles,
                content: (
                  <div className="text-muted-foreground">
                    <p className="text-base leading-relaxed mb-4">{catalogItem?.description || VALUE_MAP[product.slug] || product.description}</p>
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
                ),
              },
              {
                id: "uso",
                label: "¿Cómo usarlo?",
                Icon: Wind,
                content: (
                  <div className="grid sm:grid-cols-2 gap-4 text-muted-foreground">
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
                ),
              },
              {
                id: "envio",
                label: "Envíos & devoluciones",
                Icon: Truck,
                content: (
                  <div className="space-y-3 text-muted-foreground">
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
                ),
              },
            ].map(({ id, label, Icon, content }) => {
              const open = openSection === id
              return (
                <div key={id} className="border-b border-border">
                  <button
                    onClick={() => setOpenSection(open ? null : id)}
                    aria-expanded={open}
                    className="group flex w-full items-center justify-between gap-4 py-5 text-left"
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-primary" />
                      <span className="font-medium text-foreground">{label}</span>
                    </span>
                    <span
                      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                        open
                          ? "border-primary bg-primary text-white"
                          : "border-border text-muted-foreground group-hover:border-primary group-hover:text-primary"
                      }`}
                    >
                      {open ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    </span>
                  </button>
                  <div
                    className={`grid transition-all duration-300 ease-out ${
                      open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="pb-6">{content}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Te puede gustar / Vistos recientemente — recomendación inteligente + historial */}
          <ProductRecommendations product={product} fallback={related} />

          {/* Reseñas — debajo de las recomendaciones */}
          <div className="mt-24 lg:mt-28">
            <ReviewsSection productId={product.id} productName={product.name} productImage={product.image_url} />
          </div>
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
            <p className="font-bold text-foreground text-sm">${tier.price.toLocaleString("es-CO")} COP{tier.units > 1 ? ` · Kit x${tier.units}` : ""}</p>
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
