"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"

/**
 * StickyCta — botón de compra SIEMPRE a la mano (pedido del cliente 2026-08:
 * "que el cliente siempre lo vea y esté a un clic"). Píldora flotante abajo a
 * la IZQUIERDA (la derecha es del botón de WhatsApp) que aparece tras el
 * primer scroll real (~500px) para no ensuciar el hero.
 *
 * No se muestra donde ya existe un camino de compra propio:
 * - /productos/* tiene su barra sticky de compra (z-40)
 * - /catalogo y /arma-tu-kit SON el destino del CTA
 * - /checkout, /pedido y /gracias: el usuario ya está comprando
 * - /admin*: panel interno
 * z-30: por debajo de las barras de compra (z-40) y del header (z-50).
 */
export function StickyCta() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)

  const blocked = !!pathname && (
    pathname.startsWith("/productos") ||
    pathname.startsWith("/catalogo") ||
    pathname.startsWith("/arma-tu-kit") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/pedido") ||
    pathname.startsWith("/gracias") ||
    pathname.startsWith("/admin")
  )

  useEffect(() => {
    if (blocked) return
    let ticking = false
    const check = () => {
      ticking = false
      setVisible(window.scrollY > 500)
    }
    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(check)
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    check()
    return () => window.removeEventListener("scroll", onScroll)
  }, [blocked])

  if (blocked) return null

  return (
    <div
      className="fixed bottom-6 left-6 z-30 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <Link
        href="/catalogo"
        className="group/scta inline-flex items-center gap-3 rounded-full bg-[#2D1A14] py-2 pl-6 pr-2 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#FAF8F5] shadow-[0_12px_34px_rgba(45,26,20,0.35)] transition-colors duration-300 hover:bg-[#A67163]"
      >
        Comprar ahora
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FAF8F5] text-[#2D1A14] transition-transform duration-300 group-hover/scta:translate-x-0.5">
          <span className="text-sm leading-none">→</span>
        </span>
      </Link>
    </div>
  )
}
