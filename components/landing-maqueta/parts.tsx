import { BRANDS } from "@/lib/brands"

/**
 * Piezas que comparten las dos landings de pauta hechas con las maquetas de
 * Cliché (/arma-tu-kit y /empresas): franja de logos, testimonios, pie legal y
 * enlaces de WhatsApp. Sin "use client" a propósito: sirven igual desde un
 * componente de servidor (/empresas) que desde uno de cliente (el armador).
 *
 * Solo marcado: los estilos los pone el CSS de cada landing (.mq-kits en
 * components/kit-landing/kit-landing.css y .mq-emp en app/empresas/empresas.css),
 * copiados de su maqueta con las mismas clases (.brands, .tests, footer…).
 */

export const DEFAULT_WHATSAPP = "573223745187"

/** "573223745187" → "322 374 5187" (como lo escribe la maqueta). */
export function waDisplay(num: string): string {
  const d = num.replace(/\D/g, "").replace(/^57(?=3\d{9}$)/, "")
  return /^\d{10}$/.test(d) ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : d
}

export function waHref(num: string, text?: string): string {
  return `https://wa.me/${num}${text ? `?text=${encodeURIComponent(text)}` : ""}`
}

// ── Testimonios ──────────────────────────────────────────────────────────────
// TEXTUALES, tal cual la maqueta (decisión del cliente). Cada landing elige
// cuáles muestra y en qué orden, igual que su maqueta.

export const TESTIMONIOS = {
  mariana: { q: "Mis clientas entran y lo primero que dicen es ‘¿qué huele tan rico?’. Ahora la tienda tiene su sello.", who: "Mariana G. · Boutique · Bogotá", aroma: "Brillos de Seda" },
  catalina: { q: "Perfumo cada prenda antes de empacarla. No mancha y las mamás aman el detalle.", who: "Catalina R. · Ropa infantil · Medellín", aroma: "Vientos de Lino" },
  andres: { q: "Pedí uno de prueba para el lobby y terminé aromatizando todo el hotel. Los huéspedes preguntan por él.", who: "Andrés P. · Hotel boutique · Cali", aroma: "Tierra" },
  laura: { q: "Cada pedido sale con su aroma y una nota. Mis clientas vuelven solo por la experiencia.", who: "Laura V. · Accesorios · Barranquilla", aroma: "Romeo y Julieta" },
  daniela: { q: "Mis clientas se relajan apenas entran. El aroma ya es parte de mi servicio.", who: "Daniela M. · Spa · Bogotá", aroma: "Sello de Dios" },
  camila: { q: "Probé mil aromatizantes y ninguno dura como este en la ropa. Ya es parte de mi marca.", who: "Camila T. · Marca deportiva · Bucaramanga", aroma: "Eternamente Índigo" },
  valentina: { q: "El aroma es elegante, no empalagoso. Le da a mi marca ese aire caro que buscaba.", who: "Valentina H. · Marca premium · Cartagena", aroma: "Luxury" },
} as const

export type TestimonioId = keyof typeof TESTIMONIOS

export function MqTests({ ids }: { ids: readonly TestimonioId[] }) {
  return (
    <div className="tests">
      {ids.map((id) => {
        const t = TESTIMONIOS[id]
        return (
          <div key={id} className="test">
            <q>{t.q}</q>
            <span className="who">{t.who}</span>
            <span className="ar">{t.aroma}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Logos ────────────────────────────────────────────────────────────────────

export function MqBrands({ label }: { label: string }) {
  return (
    <div className="brands">
      <p>{label}</p>
      <div className="logos">
        {BRANDS.map((b) => (
          <span key={b.src}>
            {/* Logos pequeños ya optimizados (webp/png): <img> plano como en la maqueta. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.src} alt={b.alt} loading="lazy" />
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Pie ──────────────────────────────────────────────────────────────────────
// Datos legales de los términos (app/terminos): razón social, NIT y dirección.

export function MqFooter({ whatsappNumber }: { whatsappNumber: string }) {
  return (
    <footer>
      <span>Cliché S.A.S. · NIT 901.432.536-8 · Calle 5A # 43B-25, Local 101, Medellín</span>
      <span>WhatsApp +57 {waDisplay(whatsappNumber)} · monica@clichecolombia.com</span>
      <nav aria-label="Políticas">
        <a href="/terminos" target="_blank" rel="noopener">Términos</a>
        <a href="/privacidad" target="_blank" rel="noopener">Privacidad</a>
      </nav>
    </footer>
  )
}
