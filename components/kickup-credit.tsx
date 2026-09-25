"use client"

import { usePathname } from "next/navigation"

// Crédito del desarrollador al final de TODAS las páginas públicas (va en el
// layout raíz, no en <Footer>, porque fichas, checkout y /gracias no usan
// Footer). Mismo fondo que el footer para que se lea como su continuación.
export function KickupCredit() {
  const pathname = usePathname()
  if (pathname?.startsWith("/admin")) return null

  return (
    <div className="bg-foreground">
      <a
        href="https://kickuptech.com"
        target="_blank"
        rel="noopener"
        aria-label="Desarrollado por KickUp Technologies"
        className="mx-auto grid max-w-7xl justify-items-center gap-0.5 px-4 pb-24 pt-8 text-center transition-opacity duration-300 hover:opacity-75"
      >
        <span className="text-[9.5px] uppercase tracking-[0.34em] text-background/40">
          Desarrollado por
        </span>
        <span className="font-sans text-[clamp(30px,5vw,46px)] font-medium leading-none tracking-[0.16em] text-background/90">
          KICKUP
        </span>
        <span className="pl-[0.52em] text-[clamp(10px,1.4vw,13px)] uppercase tracking-[0.52em] text-background/55">
          Technologies
        </span>
      </a>
    </div>
  )
}
