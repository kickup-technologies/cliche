import type { Metadata } from "next"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

/**
 * SEO editable desde el panel admin (sección "SEO").
 *
 * La tabla `seo_settings` guarda, por ruta canónica, el meta título y la meta
 * descripción que la dueña escribió a mano. Si no hay fila para una ruta, se
 * usa el texto por defecto que ya vive en el código (los valores de abajo y los
 * que cada página declara). Nunca se rompe nada: sin Supabase, sin fila o con
 * error de red, el SEO por defecto sigue en pie.
 *
 * Rutas soportadas: '/', '/catalogo', '/ofertas', '/arma-tu-kit' y
 * '/productos/<slug>' para cada producto.
 */

export const SEO_MAX_TITLE = 60
export const SEO_MAX_DESCRIPTION = 160

export interface SeoRow {
  path: string
  title: string | null
  description: string | null
  updated_at?: string
}

export interface SeoOverride {
  title?: string
  description?: string
}

/** Páginas clave con su SEO por defecto (el mismo que sirve el código hoy). */
export const SEO_PAGES = [
  {
    path: "/",
    label: "Inicio",
    title: "Cliché Colombia — Aromas que Transforman tu Espacio",
    description:
      "Aromas artesanales para el hogar y la ropa. Difusores, esencias y kits de aromaterapia 100% naturales. Fabricados en Colombia. Envío gratis en compras mayores a $300.000 COP.",
  },
  {
    path: "/catalogo",
    label: "Catálogo",
    title: "Catálogo de Aromas para el Hogar y la Ropa",
    description:
      "Explora el catálogo completo de Cliché: aromas artesanales para el hogar, esencias para la ropa y difusores 100% naturales fabricados en Colombia. Envío a todo el país.",
  },
  {
    path: "/ofertas",
    label: "Ofertas",
    title: "Ofertas y Descuentos en Aromas",
    description:
      "Aprovecha las ofertas de Cliché Colombia: descuentos en aromas para el hogar, esencias para la ropa y kits de aromaterapia. Promociones por tiempo limitado con envío a todo el país.",
  },
  {
    path: "/arma-tu-kit",
    label: "Arma tu kit",
    title: "Arma tu Kit de Aromas Personalizado",
    description:
      "Crea tu kit de aromas a tu medida: elige tus esencias favoritas para el hogar y la ropa y ahorra con precios por combo. Aromas artesanales colombianos con envío a todo el país.",
  },
] as const

export type SeoPagePath = (typeof SEO_PAGES)[number]["path"]

/** Ruta canónica de un producto. */
export function productSeoPath(slug: string): string {
  return `/productos/${slug}`
}

// ── Lectura (servidor) ───────────────────────────────────────────────────────

/** Override guardado para una ruta. Devuelve {} si no hay o si algo falla. */
export async function getSeoOverride(path: string): Promise<SeoOverride> {
  if (!isSupabaseConfigured) return {}
  try {
    const { data } = await supabase
      .from("seo_settings")
      .select("title, description")
      .eq("path", path)
      .maybeSingle()
    if (!data) return {}
    const title = (data.title || "").trim()
    const description = (data.description || "").trim()
    return { ...(title ? { title } : {}), ...(description ? { description } : {}) }
  } catch {
    return {}
  }
}

/**
 * Aplica el override sobre un metadata base (incluido openGraph/twitter para
 * que lo que se comparte en redes diga lo mismo que Google).
 */
export async function withSeoOverride(path: string, base: Metadata): Promise<Metadata> {
  const override = await getSeoOverride(path)
  if (!override.title && !override.description) return base

  const title = override.title
  const description = override.description
  const merged: Metadata = { ...base }
  if (title) merged.title = title
  if (description) merged.description = description

  if (base.openGraph) {
    merged.openGraph = {
      ...(base.openGraph as Record<string, unknown>),
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
    } as Metadata["openGraph"]
  }
  if (base.twitter) {
    merged.twitter = {
      ...(base.twitter as Record<string, unknown>),
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
    } as Metadata["twitter"]
  }
  return merged
}

// ── Generación automática (nicho: aromas para el hogar, Colombia) ────────────

/** Recorta a `max` caracteres sin partir palabras. */
export function trimTo(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const lastSpace = cut.lastIndexOf(" ")
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.\-–—]+$/, "")
}

/** Meta título sugerido para un producto del catálogo. */
export function suggestProductTitle(name: string): string {
  const base = (name || "").trim()
  if (!base) return ""
  // La plantilla del layout ya añade " | Cliché Colombia" al título, así que
  // aquí no se repite la marca: se aprovechan los 60 caracteres en palabras
  // que la gente sí busca.
  return trimTo(`${base} — Aroma Artesanal para el Hogar`, SEO_MAX_TITLE)
}

/** Meta descripción sugerida para un producto del catálogo. */
export function suggestProductDescription(name: string, description?: string | null): string {
  const nombre = (name || "el aroma").trim()
  const propio = (description || "").replace(/\s+/g, " ").trim()
  // Primera frase de la descripción real del producto (si la hay): es lo más
  // específico que tenemos y a Google le gusta la descripción única.
  const primera = propio ? propio.split(/(?<=[.!?])\s/)[0] : ""
  const gancho = primera && primera.length > 25 ? primera : `${nombre}, aroma artesanal para tu hogar y tu ropa.`
  const cola = " Esencias 100% naturales hechas en Colombia. Envío a todo el país."
  return trimTo(`${gancho.replace(/\.?$/, ".")}${cola}`, SEO_MAX_DESCRIPTION)
}

/** Sugerencia para una de las páginas clave (usa su texto por defecto). */
export function suggestPageSeo(path: string): SeoOverride {
  const page = SEO_PAGES.find((p) => p.path === path)
  if (!page) return {}
  return {
    title: trimTo(page.title, SEO_MAX_TITLE),
    description: trimTo(page.description, SEO_MAX_DESCRIPTION),
  }
}

/** Semáforo de longitud, igual que el de Shopify. */
export function seoLengthTone(len: number, max: number): "empty" | "short" | "ok" | "long" {
  if (len === 0) return "empty"
  if (len > max) return "long"
  if (len < max * 0.5) return "short"
  return "ok"
}
