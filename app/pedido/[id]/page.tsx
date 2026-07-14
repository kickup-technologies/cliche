"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Package, Truck, CheckCircle, Clock, MapPin, AlertCircle, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface OrderItem {
  product_id: string
  quantity: number
  name: string
  price: number
  image_url: string
}

interface Order {
  id: string
  status: string
  total: number
  tracking_number: string | null
  customer_name: string | null
  created_at: string
  items: OrderItem[]
  stripe_session_id: string | null
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n)

const STATUS_STEPS = [
  // OJO: "pending" significa que el pago AÚN NO está acreditado (PSE puede
  // tardar). Antes decía "Tu pago fue confirmado", falso para un pedido sin
  // pagar — la confirmación real es el paso "confirmed".
  { key: "pending",   label: "Pedido recibido",  icon: Clock,        color: "text-yellow-500", bg: "bg-yellow-50",  desc: "Esperando confirmación del pago (PSE puede tardar unos minutos)" },
  { key: "confirmed", label: "Confirmado",        icon: CheckCircle,  color: "text-blue-500",   bg: "bg-blue-50",    desc: "Tu pedido está en el sistema" },
  { key: "preparing", label: "En preparación",    icon: Package,      color: "text-[#A67163]",  bg: "bg-[#A67163]/10", desc: "Estamos empacando tu aroma" },
  { key: "shipped",   label: "Despachado",        icon: Truck,        color: "text-purple-500", bg: "bg-purple-50",  desc: "En camino a tu puerta" },
  { key: "delivered", label: "Entregado",         icon: MapPin,       color: "text-green-600",  bg: "bg-green-50",   desc: "¡Disfruta tu aroma!" },
]

function stepIndex(status: string) {
  return STATUS_STEPS.findIndex((s) => s.key === status)
}

export default function PedidoPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/orders/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found")
        return r.json()
      })
      .then((d) => setOrder(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  const currentStep = order ? stepIndex(order.status) : -1

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#FAF8F5] pt-28 pb-20 px-4">
        <div className="max-w-2xl mx-auto">

          <nav className="flex items-center gap-2 text-sm text-[#2D1A14]/40 mb-8">
            <Link href="/" className="hover:text-[#A67163] transition-colors">Inicio</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#2D1A14] font-medium">Seguimiento de pedido</span>
          </nav>

          <h1 className="font-serif text-4xl font-light text-[#2D1A14] mb-1">Seguimiento</h1>
          <p className="text-sm text-[#2D1A14]/40 mb-8">Estado actual de tu pedido Cliché</p>

          {/* Loading */}
          {loading && (
            <div className="animate-pulse space-y-4">
              <div className="h-24 bg-[#2D1A14]/5 rounded-2xl" />
              <div className="h-64 bg-[#2D1A14]/5 rounded-2xl" />
              <div className="h-32 bg-[#2D1A14]/5 rounded-2xl" />
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="font-semibold text-[#2D1A14] mb-1">Pedido no encontrado</p>
              <p className="text-sm text-[#2D1A14]/50 mb-5">Verifica el número de pedido o contáctanos por WhatsApp.</p>
              <Button asChild variant="outline">
                <Link href="/">Volver al inicio</Link>
              </Button>
            </div>
          )}

          {order && !loading && (
            <div className="space-y-5">

              {/* Meta: número + total + fecha */}
              <div className="bg-[#2D1A14] text-white rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] mb-1">Número de pedido</p>
                  <p className="font-mono font-bold text-xl tracking-widest">
                    #{(order.stripe_session_id || order.id).slice(-8).toUpperCase()}
                  </p>
                  <p className="text-white/30 text-xs mt-1">
                    {new Date(order.created_at).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] mb-1">Total pagado</p>
                  <p className="font-serif text-3xl font-light">{fmt(order.total)}</p>
                </div>
              </div>

              {/* Status stepper */}
              <div className="bg-white border border-[#2D1A14]/8 rounded-2xl p-6">
                <h2 className="text-[10px] font-semibold text-[#2D1A14]/40 mb-6 uppercase tracking-[0.2em]">Estado del pedido</h2>
                <div className="relative">
                  {/* Línea vertical */}
                  <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-[#2D1A14]/6" />
                  <div className="space-y-5">
                    {STATUS_STEPS.map((step, i) => {
                      const done = i <= currentStep
                      const active = i === currentStep
                      const Icon = step.icon
                      return (
                        <div key={step.key} className="relative flex items-start gap-4">
                          <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                            done
                              ? `${step.bg} ${step.color}`
                              : "bg-[#2D1A14]/5 text-[#2D1A14]/20"
                          } ${active ? "ring-2 ring-offset-2 ring-[#A67163]/40 scale-110 shadow-md" : ""}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="pt-1.5 flex-1">
                            <p className={`text-sm font-semibold transition-colors ${done ? "text-[#2D1A14]" : "text-[#2D1A14]/30"}`}>
                              {step.label}
                            </p>
                            {active && (
                              <p className="text-xs text-[#A67163] font-medium mt-0.5">{step.desc} · Estado actual</p>
                            )}
                            {done && !active && (
                              <p className="text-xs text-[#2D1A14]/30 mt-0.5">{step.desc}</p>
                            )}
                          </div>
                          {done && !active && (
                            <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-2" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Número de guía */}
              {order.tracking_number && (
                <div className="bg-[#A67163]/8 border border-[#A67163]/20 rounded-2xl p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A67163] mb-2 flex items-center gap-2">
                    <Truck className="w-3.5 h-3.5" /> Número de guía de envío
                  </p>
                  <p className="font-mono font-bold text-2xl text-[#2D1A14] tracking-wider">{order.tracking_number}</p>
                  <p className="text-xs text-[#2D1A14]/40 mt-1">Úsalo en el sitio de tu operador logístico para rastrear tu envío en tiempo real.</p>
                </div>
              )}

              {/* Productos del pedido */}
              {order.items?.length > 0 && (
                <div className="bg-white border border-[#2D1A14]/8 rounded-2xl overflow-hidden">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#2D1A14]/40 px-6 pt-5 pb-3">
                    Productos ({order.items.length})
                  </p>
                  <div className="divide-y divide-[#2D1A14]/6">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-4 px-6 py-4">
                        {item.image_url && (
                          <div className="relative w-12 h-12 flex-shrink-0 bg-[#2D1A14]/5 overflow-hidden rounded-lg">
                            <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          {/* Fallbacks defensivos: pedidos antiguos pueden no tener
                              name/price guardados (evita "undefined" y "COP NaN") */}
                          <p className="font-serif text-sm text-[#2D1A14] leading-snug">{item.name || "Producto Cliché"}</p>
                          <p className="text-xs text-[#2D1A14]/40 mt-0.5">× {item.quantity}</p>
                        </div>
                        <p className="text-sm font-medium text-[#2D1A14] tabular-nums">
                          {fmt((Number(item.price) || 0) * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center px-6 py-4 bg-[#FAF8F5] border-t border-[#2D1A14]/6">
                    <span className="text-xs text-[#2D1A14]/40 uppercase tracking-widest">Total</span>
                    <span className="font-serif text-lg font-light text-[#2D1A14]">{fmt(order.total)}</span>
                  </div>
                </div>
              )}

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button asChild className="flex-1 bg-[#2D1A14] hover:bg-[#3D2A24]">
                  <Link href="/catalogo">Seguir comprando</Link>
                </Button>
                <Button asChild variant="outline" className="flex-1 border-[#2D1A14]/20 text-[#2D1A14]">
                  <a href="https://wa.me/573194565463?text=Hola%2C+tengo+una+pregunta+sobre+mi+pedido" target="_blank" rel="noopener noreferrer">
                    Contactar soporte
                  </a>
                </Button>
              </div>

            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
