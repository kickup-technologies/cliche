/**
 * Transportadoras que usa Cliché para despachar. Fuente ÚNICA para el selector
 * del panel admin y para el link de rastreo del correo "pedido enviado".
 *
 * `track(guia)` devuelve la URL de rastreo. FedEx y UPS aceptan la guía como
 * parámetro y la pre-cargan en su página; Servientrega e Interrapidísimo usan
 * apps de una sola página sin un parámetro público fiable, así que abrimos su
 * página de rastreo (el número de guía va SIEMPRE visible en el correo para
 * pegarlo). Si el número está vacío, no hay link.
 */
export type CarrierId = "servientrega" | "interrapidisimo" | "fedex" | "ups"

export interface Carrier {
  id: CarrierId
  name: string
  track: (guia: string) => string
}

export const CARRIERS: Carrier[] = [
  {
    id: "servientrega",
    name: "Servientrega",
    track: () => "https://www.servientrega.com/wps/portal/rastreo-envio",
  },
  {
    id: "interrapidisimo",
    name: "Interrapidísimo",
    track: () => "https://interrapidisimo.com/sigue-tu-envio/",
  },
  {
    id: "fedex",
    name: "FedEx",
    track: (g) => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(g)}`,
  },
  {
    id: "ups",
    name: "UPS",
    track: (g) => `https://www.ups.com/track?loc=es_CO&tracknum=${encodeURIComponent(g)}`,
  },
]

export function carrierById(id?: string | null): Carrier | null {
  if (!id) return null
  return CARRIERS.find((c) => c.id === id) ?? null
}

/** Nombre legible del transportista (o el id crudo si no está en la lista). */
export function carrierName(id?: string | null): string | null {
  if (!id) return null
  return carrierById(id)?.name ?? id
}

/** URL de rastreo para (transportista, guía), o null si falta alguno. */
export function trackingUrl(id?: string | null, guia?: string | null): string | null {
  const c = carrierById(id)
  const g = (guia || "").trim()
  if (!c || !g) return null
  return c.track(g)
}
