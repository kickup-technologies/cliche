import type { Metadata } from "next"
import { withSeoOverride } from "@/lib/seo"

// La página /ofertas es un client component ("use client"), por lo que el
// metadata SEO debe exportarse desde este layout (server component).
// El texto de abajo es el POR DEFECTO: si la dueña escribió algo en el panel
// admin (sección SEO), ese texto manda.
export const revalidate = 300

const BASE: Metadata = {
  title: "Ofertas y Descuentos en Aromas",
  description:
    "Aprovecha las ofertas de Cliché Colombia: descuentos en aromas para el hogar, esencias para la ropa y kits de aromaterapia. Promociones por tiempo limitado con envío a todo el país.",
  alternates: { canonical: "/ofertas" },
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: "/ofertas",
    siteName: "Cliché Colombia",
    title: "Ofertas en Aromas | Cliché Colombia",
    description:
      "Descuentos y promociones en aromas artesanales colombianos: hogar, ropa y kits. Por tiempo limitado.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Ofertas en aromas artesanales — Cliché Colombia",
      },
    ],
  },
}

export function generateMetadata(): Promise<Metadata> {
  return withSeoOverride("/ofertas", BASE)
}

export default function OfertasLayout({ children }: { children: React.ReactNode }) {
  return children
}
