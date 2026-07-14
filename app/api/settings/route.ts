import { NextRequest, NextResponse } from 'next/server'
import { supabase, createServerClient } from '@/lib/supabase'
import { parseUrgencyConfig, URGENCY_DEFAULTS } from '@/lib/urgency'
import { isAdmin } from '@/lib/admin-auth'

// Claves públicas que el sitio (hero, barra, footer, whatsapp) puede leer.
// Texto/toggles que el admin edita en la sección "Tienda".
const PUBLIC_KEYS = [
  'discount_percentage',
  'discount_code',
  'announcement_text',
  'free_shipping_threshold',
  'whatsapp_number',
  'whatsapp_message',
  'hero_title',
  'hero_subtitle',
  'hero_slides',
  'urgency_bar_enabled',
  'countdown_enabled',
  'stock_badge_enabled',
  'social_proof_enabled',
  'featured_title',
  'featured_subtitle',
  'cta_title',
  'cta_subtitle',
  'newsletter_subtitle',
  'urgency_config',
] as const

const DEFAULTS = {
  discount_percentage: 10,
  discount_code: 'BIENVENIDA10',
  announcement_text: '',
  free_shipping_threshold: 300000,
  whatsapp_number: '',
  whatsapp_message: '',
  hero_title: '',
  hero_subtitle: '',
  hero_slides: [] as string[],
  urgency_bar_enabled: true,
  countdown_enabled: true,
  stock_badge_enabled: true,
  social_proof_enabled: true,
  featured_title: 'Productos Destacados',
  featured_subtitle: 'Los favoritos de nuestra comunidad',
  cta_title: '¿Tienes una marca? Creamos tu identidad olfativa',
  cta_subtitle: 'Diseñamos aromas exclusivos para negocios que quieren diferenciarse. Hoteles, spas, tiendas y marcas deportivas ya confían en nosotros.',
  newsletter_subtitle: 'Suscríbete y recibe tu código de descuento al instante, más tips de aromaterapia y lanzamientos exclusivos.',
  urgency_config: URGENCY_DEFAULTS,
}

// GET /api/settings — devuelve todas las claves públicas de la tienda
export async function GET() {
  try {
    // Lectura con cliente ANÓNIMO: la policy RLS scoped `site_settings_scoped_public_read`
    // permite leer SOLO las claves públicas (excluye meta_capi_token). Antes usaba
    // service-role y si la SUPABASE_SERVICE_ROLE_KEY estaba mal en producción devolvía
    // siempre los DEFAULTS, así que la tienda ignoraba lo que el admin configuraba.
    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', PUBLIC_KEYS as unknown as string[])

    if (error) throw error

    const raw: Record<string, string> = {}
    for (const row of data ?? []) {
      raw[row.key] = row.value
    }

    let heroSlides: string[] = DEFAULTS.hero_slides
    if (raw.hero_slides) {
      try {
        const parsed = JSON.parse(raw.hero_slides)
        if (Array.isArray(parsed)) heroSlides = parsed.filter((s) => typeof s === 'string')
      } catch { /* valor corrupto: usar default */ }
    }

    return NextResponse.json({
      discount_percentage: Number(raw.discount_percentage ?? DEFAULTS.discount_percentage),
      discount_code: raw.discount_code ?? DEFAULTS.discount_code,
      announcement_text: raw.announcement_text ?? DEFAULTS.announcement_text,
      free_shipping_threshold: Number(raw.free_shipping_threshold ?? DEFAULTS.free_shipping_threshold),
      whatsapp_number: raw.whatsapp_number ?? DEFAULTS.whatsapp_number,
      whatsapp_message: raw.whatsapp_message ?? DEFAULTS.whatsapp_message,
      hero_title: raw.hero_title ?? DEFAULTS.hero_title,
      hero_subtitle: raw.hero_subtitle ?? DEFAULTS.hero_subtitle,
      hero_slides: heroSlides,
      urgency_bar_enabled: raw.urgency_bar_enabled !== 'false',
      countdown_enabled: raw.countdown_enabled !== 'false',
      stock_badge_enabled: raw.stock_badge_enabled !== 'false',
      social_proof_enabled: raw.social_proof_enabled !== 'false',
      featured_title: raw.featured_title ?? DEFAULTS.featured_title,
      featured_subtitle: raw.featured_subtitle ?? DEFAULTS.featured_subtitle,
      cta_title: raw.cta_title ?? DEFAULTS.cta_title,
      cta_subtitle: raw.cta_subtitle ?? DEFAULTS.cta_subtitle,
      newsletter_subtitle: raw.newsletter_subtitle ?? DEFAULTS.newsletter_subtitle,
      urgency_config: parseUrgencyConfig(raw.urgency_config),
    }, {
      // Cacheado en CDN (s-maxage) + navegador (max-age): la config se lee en
      // CADA página (barra, hero, footer, whatsapp). Con max-age el navegador la
      // reutiliza durante la sesión y no repite la petición al cambiar de página.
      headers: { "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300" },
    })
  } catch (err) {
    console.error('[settings GET]', err)
    return NextResponse.json(DEFAULTS, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" },
    })
  }
}

// PUT /api/settings — updates discount_percentage and/or discount_code
// SOLO ADMIN: antes era público y cualquiera podía cambiar el descuento/código
// del sitio (p. ej. ponerlo al 99%). Ahora exige la credencial de admin.
export async function PUT(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  try {
    const body = await req.json()
    const { discount_percentage, discount_code } = body as {
      discount_percentage?: number
      discount_code?: string
    }

    const db = createServerClient()
    const updates = []

    if (discount_percentage !== undefined) {
      updates.push(
        db.from('site_settings').upsert(
          { key: 'discount_percentage', value: String(discount_percentage) },
          { onConflict: 'key' }
        )
      )
    }

    if (discount_code !== undefined) {
      updates.push(
        db.from('site_settings').upsert(
          { key: 'discount_code', value: discount_code.toUpperCase() },
          { onConflict: 'key' }
        )
      )
    }

    await Promise.all(updates)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[settings PUT]', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
