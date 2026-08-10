import type { Metadata } from "next"
import { withSeoOverride } from "@/lib/seo"

// La página /arma-tu-kit es un client component ("use client"), por lo que el
// metadata SEO debe exportarse desde este layout (server component).
// El texto de abajo es el POR DEFECTO: si la dueña escribió algo en el panel
// admin (sección SEO), ese texto manda.
export const revalidate = 300

const BASE: Metadata = {
  title: "Arma tu Kit de Aromas Personalizado",
  description:
    "Crea tu kit de aromas a tu medida: elige tus esencias favoritas para el hogar y la ropa y ahorra con precios por combo. Aromas artesanales colombianos con envío a todo el país.",
  alternates: { canonical: "/arma-tu-kit" },
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: "/arma-tu-kit",
    siteName: "Cliché Colombia",
    title: "Arma tu Kit de Aromas | Cliché Colombia",
    description:
      "Combina tus aromas favoritos en un kit personalizado y ahorra. Esencias artesanales 100% naturales hechas en Colombia.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Arma tu kit de aromas personalizado — Cliché Colombia",
      },
    ],
  },
}

export function generateMetadata(): Promise<Metadata> {
  return withSeoOverride("/arma-tu-kit", BASE)
}

export default function ArmaTuKitLayout({ children }: { children: React.ReactNode }) {
  return children
}
