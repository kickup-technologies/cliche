import { KitLanding } from "@/components/kit-landing/kit-landing"
import { shortAromaName } from "@/lib/kit-landing"
import { loadAromas, loadRatings, loadSettings } from "@/lib/kit-datos"
import { CHRISTMAS_DEADLINE } from "@/lib/kit-landing-content"

/**
 * /arma-tu-kit — landing del kit personalizado (mezclar aromas al precio fijo
 * del kit) con el diseño de la maqueta de Cliché, tal cual. Sin el Header ni
 * el Footer de la tienda: la maqueta trae su propia cabecera (logo + WhatsApp)
 * y su pie legal, y es una página de destino de pauta.
 *
 * Server component: lee aromas, envío gratis, WhatsApp y calificaciones reales
 * de la BD; el armador interactivo vive en <KitLanding/>.
 * ISR cada 5 min (igual que el layout) para no consultar la BD por visita.
 */
export const revalidate = 3600

export default async function ArmaTuKitPage() {
  const [baseAromas, settings] = await Promise.all([loadAromas(), loadSettings()])
  const aromas = await loadRatings(baseAromas)
  const christmas = aromas.find((a) => a.slug.replace(/^aroma-/, "") === "navidad") ?? null
  // Se evalúa en cada regeneración (ISR 5 min): la fecha límite se apaga sola.
  const beforeChristmasDeadline = Date.now() <= Date.parse(CHRISTMAS_DEADLINE)

  return (
    <KitLanding
      aromas={aromas}
      freeShippingThreshold={settings.freeShippingThreshold}
      whatsappNumber={settings.whatsappNumber}
      christmasAromaId={christmas?.id ?? null}
      christmasAromaName={christmas ? shortAromaName(christmas.fullName) : null}
      showChristmasDeadline={beforeChristmasDeadline}
    />
  )
}
