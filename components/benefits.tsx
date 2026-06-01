"use client"

import { Truck, Shield, Sparkles, Clock, Leaf, Award } from "lucide-react"
import { ScrollAnimation } from "@/components/scroll-animation"

const benefits = [
  {
    icon: Sparkles,
    title: "100% Natural",
    description: "Sin colorantes, sin parabenos, sin aceites grasos — seguro en ropa, telas y para toda la familia",
    highlight: "No mancha",
  },
  {
    icon: Truck,
    title: "Envío Gratis",
    description: "En pedidos mayores a $300.000 COP a toda Colombia. Entrega en 3-5 días hábiles con número de rastreo",
    highlight: "+$300k gratis",
  },
  {
    icon: Shield,
    title: "Garantía 30 días",
    description: "Si el producto no cumple tus expectativas, te devolvemos el dinero sin preguntas vía WhatsApp",
    highlight: "Sin letra pequeña",
  },
  {
    icon: Clock,
    title: "Hasta 800 aplicaciones",
    description: "Una botella rinde 4-6 meses de uso diario — el mejor precio por aplicación del mercado",
    highlight: "6 meses por botella",
  },
]

const process = [
  {
    step: "01",
    title: "Elige tu aroma",
    description: "Explora los 22 aromas de la colección. Cada uno tiene un perfil de fragancia y un espacio ideal",
  },
  {
    step: "02",
    title: "Aplica tu descuento",
    description: "Usa el código BIENVENIDA20 para 20% OFF en tu primera compra — válido de inmediato",
  },
  {
    step: "03",
    title: "Recibe en casa",
    description: "Llega en 3-5 días hábiles con empaque protegido. Envío gratis en pedidos +$300.000",
  },
  {
    step: "04",
    title: "Transforma tu espacio",
    description: "3-5 pufs al aire o sobre textiles. El aroma dura horas en el ambiente, todo el día en telas",
  },
]

export function Benefits() {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Benefits grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {benefits.map((benefit, index) => (
            <ScrollAnimation key={benefit.title} delay={index * 100}>
              <div className="text-center p-6 rounded-2xl bg-secondary/30 hover:bg-secondary/50 transition-all duration-300 group hover:shadow-lg border border-transparent hover:border-primary/20">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                  <benefit.icon className="w-7 h-7 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <h3 className="font-serif text-lg font-bold text-foreground mb-1">
                  {benefit.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {benefit.description}
                </p>
                <span className="inline-block text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                  {benefit.highlight}
                </span>
              </div>
            </ScrollAnimation>
          ))}
        </div>

        {/* Trust Badges */}
        <ScrollAnimation className="mb-20">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-8 text-center">
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
              <div className="flex items-center gap-2">
                <Award className="w-6 h-6 text-primary" />
                <span className="font-semibold text-foreground">Marca Colombiana</span>
              </div>
              <div className="flex items-center gap-2">
                <Leaf className="w-6 h-6 text-green-600" />
                <span className="font-semibold text-foreground">Eco-Friendly</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-primary" />
                <span className="font-semibold text-foreground">Pago Seguro</span>
              </div>
            </div>
          </div>
        </ScrollAnimation>

        {/* Process section */}
        <ScrollAnimation className="text-center max-w-3xl mx-auto mb-12">
          <p className="text-sm uppercase tracking-widest text-primary font-semibold mb-4">
            Cómo Funciona
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-shimmer text-balance">
            Tu experiencia aromática en 4 pasos
          </h2>
          <span className="accent-rule mt-4" />
        </ScrollAnimation>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {process.map((item, index) => (
            <ScrollAnimation key={item.step} delay={index * 150}>
              <div className="relative">
                {/* Connector line */}
                {index < process.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-1/2 w-full h-px bg-gradient-to-r from-primary to-primary/30" />
                )}
                
                <div className="relative z-10 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-6 font-serif text-xl font-bold shadow-lg shadow-primary/30">
                    {item.step}
                  </div>
                  <h3 className="font-serif text-xl font-bold text-foreground mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            </ScrollAnimation>
          ))}
        </div>
      </div>
    </section>
  )
}
