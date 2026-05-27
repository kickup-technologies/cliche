"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Search, Package, ChevronRight } from "lucide-react"

export default function PedidoSearchPage() {
  const [reference, setReference] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const ref = reference.trim()
    if (!ref) {
      setError("Ingresa el número de pedido")
      return
    }
    router.push(`/pedido/${ref}`)
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#FAF8F5] pt-28 pb-20 px-4">
        <div className="max-w-lg mx-auto">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-[#2D1A14]/40 mb-8">
            <a href="/" className="hover:text-[#A67163] transition-colors">Inicio</a>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#2D1A14] font-medium">Seguimiento de pedido</span>
          </nav>

          {/* Icon */}
          <div className="w-16 h-16 bg-[#A67163]/10 rounded-2xl flex items-center justify-center mb-6">
            <Package className="w-8 h-8 text-[#A67163]" />
          </div>

          <h1 className="font-serif text-4xl font-light text-[#2D1A14] mb-2">Seguimiento</h1>
          <p className="text-[#2D1A14]/50 text-sm mb-10">
            Ingresa tu número de pedido para ver el estado actual de tu envío.
            Lo encontrarás en el correo de confirmación que te enviamos.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reference" className="block text-xs font-semibold uppercase tracking-widest text-[#2D1A14]/50 mb-2">
                Número de pedido
              </label>
              <div className="relative">
                <input
                  id="reference"
                  type="text"
                  value={reference}
                  onChange={(e) => { setReference(e.target.value); setError("") }}
                  placeholder="ej: cliche_1748000000_abc12"
                  className="w-full bg-white border border-[#2D1A14]/15 rounded-xl px-4 py-3.5 text-[#2D1A14] placeholder-[#2D1A14]/30 focus:outline-none focus:ring-2 focus:ring-[#A67163]/40 focus:border-[#A67163] transition-all pr-12 text-sm font-mono"
                />
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2D1A14]/30" />
              </div>
              {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
            </div>

            <button
              type="submit"
              className="w-full bg-[#2D1A14] hover:bg-[#3D2A24] text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              Buscar mi pedido
            </button>
          </form>

          {/* Help */}
          <div className="mt-8 bg-white border border-[#2D1A14]/8 rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#2D1A14]/40 mb-3">¿Dónde encuentro mi número de pedido?</p>
            <ul className="space-y-2 text-sm text-[#2D1A14]/60">
              <li className="flex items-start gap-2">
                <span className="text-[#A67163] font-bold mt-0.5">1.</span>
                En el correo de confirmación que te enviamos al comprar.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#A67163] font-bold mt-0.5">2.</span>
                En la página de éxito después de completar tu pago (enlace &quot;Seguir mi pedido&quot;).
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#A67163] font-bold mt-0.5">3.</span>
                Si no lo tienes, escríbenos al{" "}
                <a href="https://wa.me/573194565463" className="text-[#A67163] font-semibold hover:underline" target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>{" "}
                y te ayudamos.
              </li>
            </ul>
          </div>

        </div>
      </main>
      <Footer />
    </>
  )
}
