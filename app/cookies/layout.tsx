import type { Metadata } from "next"

// /cookies es un client component ("use client") y no puede exportar metadata,
// así que va aquí. Está en el sitemap: sin canónica, cualquier enlace con
// ?utm_source=… se le indexa a Google como una página distinta.
export const metadata: Metadata = {
  alternates: { canonical: "/cookies" },
  title: "Política de Cookies",
  description:
    "Qué cookies usa Cliché Colombia, para qué sirven y cómo cambiar tus preferencias en cualquier momento.",
}

export default function CookiesLayout({ children }: { children: React.ReactNode }) {
  return children
}
