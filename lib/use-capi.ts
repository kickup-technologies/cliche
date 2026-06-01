"use client"

/**
 * useCAPI — fires both browser Pixel (fbq) AND server-side Conversions API
 * simultaneously for every event, maximizing coverage.
 */

import { useCallback } from 'react'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
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
}

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1]
}

function generateEventId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`
}

export function useCAPI() {
  const track = useCallback(async (payload: CAPIEventPayload) => {
    const { event_name, custom_data, user_data } = payload
    const event_id = generateEventId()
    const event_source_url = window.location.href

    // 1. Browser pixel (deduplication via event_id)
    if (typeof window.fbq === 'function') {
      if (event_name === 'PageView') {
        window.fbq('track', 'PageView', {}, { eventID: event_id })
      } else {
        window.fbq('track', event_name, custom_data || {}, { eventID: event_id })
      }
    }

    // 2. Server-side CAPI (same event_id for deduplication)
    const fbc = getCookie('_fbc')
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
