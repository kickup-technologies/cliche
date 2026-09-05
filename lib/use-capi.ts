"use client"

/**
 * useCAPI — fires both browser Pixel (fbq) AND server-side Conversions API
 * simultaneously for every event, maximizing coverage.
 */

import { useCallback } from 'react'
import { getConsent } from '@/components/cookie-consent'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    gtag?: (...args: unknown[]) => void
  }
}

/**
 * Espejo a GA4: el embudo (view_item → add_to_cart → begin_checkout →
 * purchase) solo existía en Meta; GA4 recibía únicamente page_view y era
 * imposible analizar fugas ahí. Mapeo evento Meta → evento ecommerce GA4.
 */
const GA4_EVENT_MAP: Partial<Record<CAPIEventPayload['event_name'], string>> = {
  ViewContent: 'view_item',
  AddToCart: 'add_to_cart',
  AddToWishlist: 'add_to_wishlist',
  InitiateCheckout: 'begin_checkout',
  AddPaymentInfo: 'add_payment_info',
  Purchase: 'purchase',
  Lead: 'generate_lead',
  Subscribe: 'sign_up',
  CompleteRegistration: 'sign_up',
  Search: 'search',
}

function sendGA4(payload: CAPIEventPayload, event_id: string) {
  const ga4Name = GA4_EVENT_MAP[payload.event_name]
  if (!ga4Name) return // PageView ya lo envía PixelRouteTracker

  const cd = payload.custom_data
  const params: Record<string, unknown> = {}
  if (cd?.value !== undefined) params.value = cd.value
  params.currency = cd?.currency || 'COP'
  if (cd?.content_ids?.length) {
    params.items = cd.content_ids.map((id) => ({
      item_id: id,
      item_name: cd.content_name || id,
    }))
  } else if (cd?.content_name) {
    params.items = [{ item_id: cd.content_name, item_name: cd.content_name }]
  }
  // transaction_id evita compras dobles en GA4 si el comprador recarga /gracias
  // (el Purchase llega con event_id = referencia del pedido).
  if (ga4Name === 'purchase') params.transaction_id = event_id

  // gtag carga DIFERIDO (primer gesto o 3.5s — ver PixelManager): un view_item
  // disparado antes se perdería. Si aún no está listo, el evento espera en una
  // cola que PixelManager drena justo después del config de GA4.
  if (typeof window.gtag === 'function') {
    window.gtag('event', ga4Name, params)
  } else {
    const w = window as unknown as { __ga4Queue?: Array<[string, Record<string, unknown>]> }
    w.__ga4Queue = w.__ga4Queue || []
    w.__ga4Queue.push([ga4Name, params])
  }
}

export interface CAPIEventPayload {
  event_name:
    | 'PageView'
    | 'ViewContent'
    | 'AddToCart'
    | 'AddToWishlist'
    | 'InitiateCheckout'
    | 'AddPaymentInfo'
    | 'Purchase'
    | 'Lead'
    | 'Subscribe'
    | 'CompleteRegistration'
    | 'Search'
  custom_data?: {
    currency?: string
    value?: number
    content_ids?: string[]
    content_name?: string
    content_type?: string
    num_items?: number
  }
  user_data?: {
    em?: string[]
    ph?: string[]
    fbc?: string
    fbp?: string
    /** Email crudo — el servidor lo hashea con SHA-256 antes de enviar a Meta */
    raw_email?: string
    /** Teléfono crudo — el servidor lo normaliza y hashea antes de enviar a Meta */
    raw_phone?: string
  }
  /**
   * Id de deduplicación explícito. El Purchase DEBE pasar la referencia del
   * pedido: el servidor (lib/capi-server) envía el mismo evento con ese id al
   * confirmar, y solo con ids IGUALES Meta deduplica en vez de contar doble.
   */
  event_id?: string
}

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1]
}

/**
 * fbc con respaldo manual ("parameter builder" de Meta): la cookie _fbc la
 * crea el píxel del navegador, pero en iOS/adblock (la mayoría del tráfico de
 * pauta) puede no existir aunque la visita SÍ venga de un anuncio (fbclid en
 * la URL). Sin fbc, el evento del servidor pierde la atribución al clic — Meta
 * reportaba "baja cobertura de fbc". Aquí se construye con el formato oficial
 * fb.1.<ms>.<fbclid> y se conserva en sessionStorage para que TODO el embudo
 * de esa sesión (ViewContent → … → Purchase) viaje con el id del clic.
 */
function ensureFbc(): string | undefined {
  const cookie = getCookie('_fbc')
  if (cookie) return cookie
  try {
    const fbclid = new URLSearchParams(window.location.search).get('fbclid')
    if (fbclid) {
      const built = `fb.1.${Date.now()}.${fbclid}`
      sessionStorage.setItem('_cliche_fbc', built)
      return built
    }
    return sessionStorage.getItem('_cliche_fbc') || undefined
  } catch {
    return undefined
  }
}

function generateEventId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`
}

export function useCAPI() {
  const track = useCallback(async (payload: CAPIEventPayload) => {
    // Consentimiento (modelo opt-out, igual que PixelManager), por categoría:
    // GA4 depende de "analytics" y Meta (Pixel+CAPI) de "marketing".
    const consent = getConsent()
    const analyticsOk = consent ? consent.analytics : true
    const marketingOk = consent ? consent.marketing : true

    const { event_name, custom_data, user_data } = payload
    const event_id = payload.event_id || generateEventId()
    const event_source_url = window.location.href

    // 0. Espejo GA4 (embudo view_item → … → purchase)
    if (analyticsOk) {
      try { sendGA4(payload, event_id) } catch { /* nunca romper el flujo */ }
    }

    if (!marketingOk) return

    // 1. Browser pixel (deduplication via event_id)
    if (typeof window.fbq === 'function') {
      if (event_name === 'PageView') {
        window.fbq('track', 'PageView', {}, { eventID: event_id })
      } else {
        window.fbq('track', event_name, custom_data || {}, { eventID: event_id })
      }
    }

    // 2. Server-side CAPI (same event_id for deduplication)
    const fbc = ensureFbc()
    const fbp = getCookie('_fbp')

    await fetch('/api/capi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name,
        event_source_url,
        event_id,
        custom_data,
        user_data: { fbc, fbp, ...user_data },
      }),
    }).catch(() => {/* silent fail — pixel already fired */})
  }, [])

  return { track }
}
