/**
 * Datos y tipos del hero editorial de la portada — en su propio módulo (sin
 * "use client") para que los compartan el componente público, el editor 1:1
 * del panel (sección Portada) y el API que guarda los cambios.
 *
 * El panel NO reemplaza la estructura (media queries, zooms, layout split de
 * móvil): guarda OVERRIDES por diapositiva (textos y fotos) que se aplican
 * sobre estos valores por defecto. Campo vacío = se usa el de fábrica.
 */

// mobileSrc (imagen vertical) activa el layout "split" en celular para cualquier
// tipo de media: en PC se muestra el video/imagen de fondo; en móvil, esa imagen.
export type SlideMedia = {
  type: "video" | "image"
  src: string
  poster?: string
  mobileSrc?: string
  objectPosition?: string
  mobileObjectPosition?: string
  // desktopContain: en PC muestra la imagen COMPLETA (object-contain) en vez de
  // recortarla; las barras que quedan usan `bg` (color del fondo de la foto).
  desktopContain?: boolean
  bg?: string
  // Zoom fino por dispositivo (transform scale sobre la imagen).
  desktopScale?: number
  mobileScale?: number
  mobileBg?: string
}

export interface Slide {
  media: SlideMedia
  eyebrow?: string
  title: string
  subtitle?: string
  cta?: { label: string; href: string }
  microcopy?: string
  align?: "center" | "left"
}

export const DEFAULT_SLIDES: Slide[] = [
  {
    media: { type: "image", src: "/images/segments/bano.png", mobileSrc: "/images/segments/bano-mobile.png" },
    eyebrow: "Vestidos de baño & playa",
    title: "Tu marca también\nhuele a verano",
    subtitle: "MAHAI impregna tus prendas de baño con frutas exóticas que duran todo el día y no manchan la tela.",
    cta: { label: "Comprar MAHAI", href: "/productos/aroma-mahai" },
    microcopy: "Frutas exóticas · No mancha · Larga duración",
    align: "left",
  },
  {
    media: { type: "image", src: "/images/segments/best-friends.png", mobileSrc: "/images/segments/best-friends-mobile.png", desktopContain: true, bg: "#f2dac1", mobileObjectPosition: "center 42%", objectPosition: "64% center", desktopScale: 1.1, mobileScale: 0.92, mobileBg: "#fce4ca" },
    eyebrow: "Mascotas & sus espacios",
    title: "Que su rincón huela\ntan bien como ellos",
    subtitle: "Best Friends refresca las camas, mantas y espacios de tus mascotas con frambuesa, flores dulces y azúcar suave. Limpio, seguro y de larga duración.",
    cta: { label: "Comprar Best Friends", href: "/productos/aroma-best-friends" },
    microcopy: "Frambuesa · Flores dulces · Seguro para sus espacios",
    align: "left",
  },
  {
    media: { type: "image", src: "/images/segments/gym-v2.png", mobileSrc: "/images/segments/gym-mobile-v2.png" },
    eyebrow: "Ropa deportiva & activewear",
    title: "Tres aromas que\nvisten tu marca",
    subtitle: "Lycra de Verano, Brillos de Seda y Eternamente Índigo: frescura que acompaña cada prenda, entrenamiento tras entrenamiento.",
    cta: { label: "Ver la colección", href: "/catalogo" },
    microcopy: "Frescura duradera · No mancha · Ideal para activewear",
    align: "left",
  },
]

/** Lo que el panel puede cambiar por diapositiva; "" u omitido = de fábrica. */
export type HeroOverride = {
  eyebrow?: string
  title?: string
  subtitle?: string
  microcopy?: string
  ctaLabel?: string
  ctaHref?: string
  /** Foto de PC subida desde el panel (reemplaza también un video). */
  src?: string
  /** Foto vertical de celular subida desde el panel. */
  mobileSrc?: string
}

const S = (v: unknown, max: number) => String(v ?? "").slice(0, max)

/** Valida lo guardado en site_settings (JSON) → un override por diapositiva. */
export function parseHeroOverrides(raw: unknown): HeroOverride[] {
  try {
    const v = typeof raw === "string" ? JSON.parse(raw) : raw
    const arr = Array.isArray(v) ? v : Array.isArray((v as { slides?: unknown[] })?.slides) ? (v as { slides: unknown[] }).slides : []
    return arr.slice(0, DEFAULT_SLIDES.length).map((o) => {
      const s = (o && typeof o === "object" ? o : {}) as Record<string, unknown>
      const out: HeroOverride = {}
      if (s.eyebrow) out.eyebrow = S(s.eyebrow, 120)
      if (s.title) out.title = S(s.title, 200)
      if (s.subtitle) out.subtitle = S(s.subtitle, 500)
      if (s.microcopy) out.microcopy = S(s.microcopy, 200)
      if (s.ctaLabel) out.ctaLabel = S(s.ctaLabel, 60)
      if (s.ctaHref) out.ctaHref = S(s.ctaHref, 300)
      if (s.src) out.src = S(s.src, 500)
      if (s.mobileSrc) out.mobileSrc = S(s.mobileSrc, 500)
      return out
    })
  } catch {
    return []
  }
}

/** Diapositivas finales: los overrides del panel sobre las de fábrica. */
export function applyHeroOverrides(overrides?: HeroOverride[]): Slide[] {
  if (!overrides?.length) return DEFAULT_SLIDES
  return DEFAULT_SLIDES.map((slide, i) => {
    const o = overrides[i]
    if (!o || !Object.keys(o).length) return slide
    return {
      ...slide,
      eyebrow: o.eyebrow || slide.eyebrow,
      title: o.title || slide.title,
      subtitle: o.subtitle || slide.subtitle,
      microcopy: o.microcopy || slide.microcopy,
      cta: slide.cta || o.ctaLabel
        ? { label: o.ctaLabel || slide.cta?.label || "", href: o.ctaHref || slide.cta?.href || "/catalogo" }
        : undefined,
      media: {
        ...slide.media,
        // Una foto subida desde el panel reemplaza el media de PC (aunque el
        // de fábrica fuera un video) y anula los ajustes finos de la original.
        ...(o.src
          ? { type: "image" as const, src: o.src, desktopContain: false, desktopScale: undefined, objectPosition: "center" }
          : {}),
        ...(o.mobileSrc ? { mobileSrc: o.mobileSrc, mobileScale: undefined, mobileObjectPosition: "center" } : {}),
      },
    }
  })
}
