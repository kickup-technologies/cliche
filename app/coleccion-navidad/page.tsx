import type { Metadata } from "next"
import { KitLanding } from "@/components/kit-landing/kit-landing"
import { withSeoOverride } from "@/lib/seo"
import { shortAromaName } from "@/lib/kit-landing"
import { loadAromas, loadRatings, loadSettings } from "@/lib/kit-datos"
import { CHRISTMAS_DEADLINE } from "@/lib/kit-landing-content"

/**
 * /coleccion-navidad — landing de pauta de diciembre: el kit x4 (precio de
 * lib/pricing) con los cuatro aromas que la persona elija. Es el mismo armador
 * de /arma-tu-kit en modo «Colección de Navidad».
 */
export const revalidate = 3600

const TITULO = "Colección de Navidad: 4 aromas a tu elección"
const DESCRIPCION = "Cuatro aromas de 250 ml para la casa y la ropa, los que tú elijas. Pagas al recibir y llega a toda Colombia."

export function generateMetadata(): Promise<Metadata> {
  return withSeoOverride("/coleccion-navidad", {
    title: TITULO,
    description: DESCRIPCION,
    alternates: { canonical: "/coleccion-navidad" },
    openGraph: {
      type: "website",
      locale: "es_CO",
      url: "/coleccion-navidad",
      siteName: "Cliché Colombia",
      title: `${TITULO} | Cliché Colombia`,
      description: DESCRIPCION,
      images: [{ url: "/images/landing/kit-aromas-cliche.jpg", width: 1200, height: 1500, alt: "Aromas Cliché de 250 ml" }],
    },
  })
}

export default async function ColeccionNavidadPage() {
  const [baseAromas, settings] = await Promise.all([loadAromas(), loadSettings()])
  const aromas = await loadRatings(baseAromas)
  const christmas = aromas.find((a) => a.slug.replace(/^aroma-/, "") === "navidad") ?? null

  return (
    <KitLanding
      coleccion
      aromas={aromas}
      freeShippingThreshold={settings.freeShippingThreshold}
      whatsappNumber={settings.whatsappNumber}
      christmasAromaId={christmas?.id ?? null}
      christmasAromaName={christmas ? shortAromaName(christmas.fullName) : null}
      showChristmasDeadline={Date.now() <= Date.parse(CHRISTMAS_DEADLINE)}
    />
  )
}
