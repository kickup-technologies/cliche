"use client"

import { useEffect, useState } from "react"
import { ShieldCheck, BarChart2, Megaphone, Lock, Check } from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { getConsent, saveConsent, type ConsentState } from "@/components/cookie-consent"

/**
 * Página de Política y Preferencias de Cookies — Cliché Aromas
 *
 * Aquí (y solo aquí) el usuario puede activar/desactivar cada categoría de
 * forma granular. El banner de la tienda solo ofrece Aceptar / Solo esenciales;
 * la personalización fina vive en esta página dedicada.
 */

export default function CookiesPage() {
  // Por defecto todo activado para maximizar la mejor experiencia
  const [analytics, setAnalytics] = useState(true)
  const [marketing, setMarketing] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const c = getConsent()
    if (c) {
      setAnalytics(c.analytics)
      setMarketing(c.marketing)
    }
  }, [])

  const persist = (next: Partial<Pick<ConsentState, "analytics" | "marketing">>) => {
    const a = next.analytics ?? analytics
    const m = next.marketing ?? marketing
    setAnalytics(a)
    setMarketing(m)
    saveConsent({
      necessary: true,
      analytics: a,
      marketing: m,
      timestamp: new Date().toISOString(),
    })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2200)
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#fdf8f6]">
        <div className="container mx-auto max-w-3xl px-4 py-12 sm:py-16">
          <div className="text-center mb-10">
            <span className="inline-flex w-12 h-12 rounded-2xl bg-[#f6ede9] items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6 text-[#A67163]" />
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#2D1A14]">
              Política de Cookies
            </h1>
            <p className="text-[#7a6a63] mt-3 max-w-xl mx-auto leading-relaxed">
              Tu privacidad importa. Aquí te explicamos qué son las cookies, para
              qué las usamos y cómo puedes controlarlas en cualquier momento.
            </p>
          </div>

          {/* Qué son */}
          <section className="bg-white rounded-2xl border border-[#ece2dc] p-6 sm:p-8 mb-6">
            <h2 className="text-lg font-serif font-bold text-[#2D1A14] mb-3">
              ¿Qué son las cookies?
            </h2>
            <p className="text-sm text-[#6b5a54] leading-relaxed">
              Las cookies son pequeños archivos que se guardan en tu dispositivo
              cuando visitas nuestra tienda. Nos permiten recordar tu carrito,
              mantener tu sesión y entender qué productos te gustan para ofrecerte
              una experiencia más fluida y personalizada. La mayoría son
              inofensivas y mejoran directamente tu compra.
            </p>
          </section>

          {/* Preferencias */}
          <section className="bg-white rounded-2xl border border-[#ece2dc] p-6 sm:p-8 mb-6">
            <h2 className="text-lg font-serif font-bold text-[#2D1A14] mb-1">
              Tus preferencias
            </h2>
            <p className="text-sm text-[#9e8a84] mb-6">
              Te recomendamos mantenerlas activas para disfrutar la mejor versión
              de Cliché. Los cambios se guardan al instante.
            </p>

            <div className="space-y-4">
              <PreferenceRow
                icon={<Lock className="w-5 h-5 text-green-600" />}
                title="Estrictamente necesarias"
                desc="Carrito de compras y sesión. Sin ellas la tienda no funciona."
                enabled
                locked
              />
              <PreferenceRow
                icon={<BarChart2 className="w-5 h-5 text-[#A67163]" />}
                title="Analíticas"
                desc="Nos ayudan a entender qué funciona para mejorar la tienda. Nunca vendemos tus datos."
                enabled={analytics}
                onChange={(v) => persist({ analytics: v })}
              />
              <PreferenceRow
                icon={<Megaphone className="w-5 h-5 text-[#A67163]" />}
                title="Marketing"
                desc="Nos permiten mostrarte productos relevantes y ofertas pensadas para ti en Meta (Facebook/Instagram)."
                enabled={marketing}
                onChange={(v) => persist({ marketing: v })}
              />
            </div>

            <div className="flex items-center gap-3 mt-7">
              <button
                onClick={() => persist({ analytics: true, marketing: true })}
                className="flex-1 py-3 rounded-full text-sm font-semibold bg-[#A67163] text-white hover:bg-[#8f5e51] transition-colors"
              >
                Aceptar todas
              </button>
              <button
                onClick={() => persist({ analytics: false, marketing: false })}
                className="px-5 py-3 rounded-full text-sm font-medium border border-[#d6c8c2] text-[#6b5a54] hover:border-[#A67163] hover:text-[#A67163] transition-colors"
              >
                Solo esenciales
              </button>
            </div>

            {saved && (
              <p className="flex items-center justify-center gap-1.5 text-xs text-green-700 mt-4">
                <Check className="w-3.5 h-3.5" /> Preferencias guardadas
              </p>
            )}
          </section>

          {/* Derechos legales */}
          <section className="bg-white rounded-2xl border border-[#ece2dc] p-6 sm:p-8">
            <h2 className="text-lg font-serif font-bold text-[#2D1A14] mb-3">
              Tus derechos
            </h2>
            <p className="text-sm text-[#6b5a54] leading-relaxed">
              Conforme a la <strong>Ley 1581 de 2012</strong> y el{" "}
              <strong>Decreto 1377 de 2013</strong> (Colombia), y a las normativas
              de protección de datos de América Latina (LFPDPPP en México, LGPD en
              Brasil, Ley 25.326 en Argentina), tienes derecho a conocer,
              actualizar, rectificar y solicitar la supresión de tus datos
              personales (Arts. 8 y 16). Para ejercer estos derechos, escríbenos a{" "}
              <a
                href="mailto:monica@clichecolombia.com"
                className="text-[#A67163] underline underline-offset-2 hover:text-[#8f5e51]"
              >
                monica@clichecolombia.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}

function PreferenceRow({
  icon,
  title,
  desc,
  enabled,
  locked,
  onChange,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  enabled: boolean
  locked?: boolean
  onChange?: (v: boolean) => void
}) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-[#fdf8f6] border border-[#f0e8e4]">
      <span className="mt-0.5 flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#2D1A14]">{title}</p>
        <p className="text-xs text-[#9e8a84] leading-relaxed mt-1">{desc}</p>
      </div>
      {locked ? (
        <span className="text-[11px] text-green-600 font-semibold flex-shrink-0 mt-1">
          Siempre activas
        </span>
      ) : (
        <button
          role="switch"
          aria-checked={enabled}
          aria-label={title}
          onClick={() => onChange?.(!enabled)}
          className={`flex-shrink-0 mt-1 w-11 h-6 rounded-full transition-colors relative ${
            enabled ? "bg-[#A67163]" : "bg-[#d6c8c2]"
          }`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              enabled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      )}
    </div>
  )
}
