import { Star, Truck, ShieldCheck } from "lucide-react"

/**
 * SocialProofBar — franja delgada de prueba social INMEDIATAMENTE después del
 * hero (pedido del cliente 2026-08-26: "reseñas y número de clientes más
 * arriba"). Fondo café continuo con el hero para que se lea como su remate.
 *
 * ⚠️ BRAND_COUNT: confirmar la cifra real con el cliente antes de subirla o
 * ajustarla — hoy es conservadora (los 7 logos de brand-logos.tsx son marcas
 * reales que aparecen en clichecolombia.com).
 */
const BRAND_COUNT = "+40"
const RATING = "4.7"

export function SocialProofBar() {
  return (
    <section
      aria-label="Confianza Cliché"
      className="border-b border-white/10 bg-[#2D1A14] px-4 py-4 md:py-5"
    >
      <div className="container mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-3 md:gap-x-14">
        {/* Reseñas */}
        <div className="flex items-center gap-2.5">
          <span className="flex gap-0.5 text-[#E8B87D]">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-3.5 w-3.5 fill-current" />
            ))}
          </span>
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/85">
            {RATING}/5 en reseñas de clientes
          </span>
        </div>

        {/* Clientes / marcas */}
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/85">
          <span className="text-[#E8B87D]">{BRAND_COUNT}</span> marcas ya tienen su aroma propio
        </p>

        {/* Envío + pago (confianza transaccional) */}
        <div className="hidden items-center gap-2 sm:flex">
          <Truck className="h-3.5 w-3.5 text-[#E8B87D]" />
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/85">
            Envíos a toda Colombia
          </span>
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          <ShieldCheck className="h-3.5 w-3.5 text-[#E8B87D]" />
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/85">
            Pago protegido
          </span>
        </div>
      </div>
    </section>
  )
}
