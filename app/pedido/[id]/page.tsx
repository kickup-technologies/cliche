"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Package, Truck, CheckCircle, Clock, MapPin, AlertCircle, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Order {
  id: string
  status: string
  total: number
  tracking_number: string | null
  customer_name: string | null
  created_at: string
  items: Array<{ product_id: string; quantity: number }>
}

const STATUS_STEPS = [
  { key: "pending",    label: "Pedido recibido",      icon: Clock,        color: "text-yellow-500", bg: "bg-yellow-50" },
  { key: "confirmed",  label: "Confirmado",           icon: CheckCircle,  color: "text-blue-500",   bg: "bg-blue-50" },
  { key: "preparing",  label: "En preparación",       icon: Package,      color: "text-primary",    bg: "bg-primary/10" },
  { key: "shipped",    label: "Despachado",           icon: Truck,        color: "text-purple-500", bg: "bg-purple-50" },
  { key: "delivered",  label: "Entregado",            icon: MapPin,       color: "text-green-600",  bg: "bg-green-50" },
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
      <main className="min-h-screen bg-background pt-28 pb-20 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
            <Link href="/" className="hover:text-primary transition-colors">Inicio</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium">Seguimiento de pedido</span>
          </nav>

          <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Seguimiento de pedido</h1>

          {loading && (
            <div className="animate-pulse space-y-4 mt-8">
              <div className="h-6 bg-muted rounded w-48" />
              <div className="h-32 bg-muted rounded-2xl" />
              <div className="h-24 bg-muted rounded-2xl" />
            </div>
          )}

          {error && !loading && (
            <div className="mt-8 bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="font-semibold text-foreground mb-1">Pedido no encontrado</p>
              <p className="text-sm text-muted-foreground mb-4">Verifica el número de pedido o contáctanos.</p>
              <Button asChild variant="outline">
                <Link href="/">Volver al inicio</Link>
              </Button>
            </div>
          )}

          {order && !loading && (
            <div className="space-y-6 mt-6">
              {/* Order meta */}
              <div className="bg-card border border-border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Número de pedido</p>
                  <p className="font-mono font-bold text-lg text-foreground">#{order.id.slice(-8).toUpperCase()}</p>
                </div>
                <div className="sm:text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total pagado</p>
                  <p className="font-bold text-lg text-foreground">
                    {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(order.total / 100)}
                  </p>
                </div>
              </div>

              {/* Status stepper */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-foreground mb-6 uppercase tracking-wide">Estado del pedido</h2>
                <div className="relative">
                  {/* vertical line */}
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
                  <div className="space-y-6">
                    {STATUS_STEPS.map((step, i) => {
                      const done = i <= currentStep
                      const active = i === currentStep
                      const Icon = step.icon
                      return (
                        <div key={step.key} className="relative flex items-start gap-4">
                          <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                            done ? `${step.bg} ring-2 ring-offset-2 ring-current ${step.color}` : "bg-muted text-muted-foreground"
                          } ${active ? "scale-110 shadow-md" : ""}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="pt-1.5">
                            <p className={`text-sm font-semibold ${done ? "text-foreground" : "text-muted-foreground"}`}>
                              {step.label}
                            </p>
                            {active && (
                              <p className="text-xs text-primary font-medium mt-0.5">Estado actual</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Tracking number */}
              {order.tracking_number && (
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-2 flex items-center gap-2">
                    <Truck className="w-4 h-4" /> Número de guía
                  </p>
                  <p className="font-mono font-bold text-xl text-foreground tracking-wider">{order.tracking_number}</p>
                  <p className="text-xs text-muted-foreground mt-1">Usa este número en el sitio de tu operador logístico para rastrear tu envío.</p>
                </div>
              )}

              {/* Items count */}
              <div className="bg-muted/30 rounded-2xl p-5">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{order.items?.length ?? "–"}</span>{" "}
                  {(order.items?.length ?? 0) === 1 ? "producto" : "productos"} en este pedido
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button asChild className="flex-1">
                  <Link href="/catalogo">Seguir comprando</Link>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <a href="https://wa.me/573000000000?text=Hola%2C+tengo+una+pregunta+sobre+mi+pedido" target="_blank" rel="noopener noreferrer">
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
