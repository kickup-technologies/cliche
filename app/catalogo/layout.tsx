import type { Metadata } from "next"

// La página /catalogo es un client component ("use client"), por lo que el
// metadata SEO debe exportarse desde este layout (server component).
export const metadata: Metadata = {
  title: "Catálogo de Aromas para el Hogar y la Ropa",
  description:
    "Explora el catálogo completo de Cliché: aromas artesanales para el hogar, esencias para la ropa y difusores 100% naturales fabricados en Colombia. Envío a todo el país.",
  alternates: { canonical: "/catalogo" },
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: "/catalogo",
    siteName: "Cliché Colombia",
    title: "Catálogo de Aromas | Cliché Colombia",
    description:
      "Todos nuestros aromas artesanales para el hogar y la ropa en un solo lugar. Esencias 100% naturales hechas en Colombia.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Catálogo de aromas artesanales Cliché Colombia",
      },
    ],
  },
}

export default function CatalogoLayout({ children }: { children: React.ReactNode }) {
  return children
}
