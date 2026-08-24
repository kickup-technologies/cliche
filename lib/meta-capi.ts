/**
 * Meta Conversions API — server-side helper
 * Pixel ID: 1574258694440791 | Dataset: Cliché Aromas
 *
 * Advanced Matching: hashing de email/teléfono con SHA-256 según spec de Meta.
 * El hashing ocurre SIEMPRE en el servidor — el email/teléfono crudo nunca
 * viaja directamente a Meta desde el navegador.
 */

import crypto from 'crypto'

const PIXEL_ID = '1574258694440791'
// SECRETO: solo desde variable de entorno. Nunca hardcodear el token aquí
// (queda en git y es robable). Si falta, los eventos CAPI se omiten en silencio.
const CAPI_TOKEN = process.env.META_CAPI_TOKEN
const API_VERSION = 'v19.0'

/**
 * SHA-256 hash normalizado según los requisitos de Meta Advanced Matching.
 * - Email: lowercase, trim
 * - Teléfono: solo dígitos, con código de país (ej. "573001234567")
 * - Nombre: lowercase, trim, sin tildes
 */
export function hashValue(raw: string): string {
  return crypto.createHash('sha256').update(raw.toLowerCase().trim()).digest('hex')
}

export function normalizePhone(phone: string): string {
  // Dejar solo dígitos
  const digits = phone.replace(/\D/g, '')
  // Si ya empieza con 57 (Colombia) y tiene 12 dígitos → ok
  if (digits.startsWith('57') && digits.length === 12) return digits
  // Si tiene 10 dígitos (número local colombiano) → agregar 57
  if (digits.length === 10) return `57${digits}`
  return digits
}

export interface CAPIUserData {
  client_ip_address?: string
  client_user_agent?: string
  em?: string[]   // SHA-256 hashed email(s)
  ph?: string[]   // SHA-256 hashed phone(s)
  fbc?: string    // fb click cookie
  fbp?: string    // fb browser cookie
}

export interface CAPICustomData {
  currency?: string
  value?: number
  content_ids?: string[]
  content_name?: string
  content_type?: string
  num_items?: number
}

export interface CAPIEvent {
  event_name: string
  event_time: number
  event_source_url: string
  event_id: string
  action_source: 'website'
  user_data: CAPIUserData
  custom_data?: CAPICustomData
}

export async function sendCAPIEvents(events: CAPIEvent[]) {
  if (!CAPI_TOKEN) {
    // Sin token configurado en el entorno → no se envían eventos server-side.
    return null
  }
  try {
    const url = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${CAPI_TOKEN}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: events }),
    })
    return await res.json()
  } catch (err) {
    console.error('[CAPI] Error sending event:', err)
    return null
  }
}
