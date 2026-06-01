/**
 * Meta Conversions API — server-side helper
 * Pixel ID: 2074090273450880 | Dataset: Cliché Aromas
 *
 * Advanced Matching: hashing de email/teléfono con SHA-256 según spec de Meta.
 * El hashing ocurre SIEMPRE en el servidor — el email/teléfono crudo nunca
 * viaja directamente a Meta desde el navegador.
 */

import crypto from 'crypto'

const PIXEL_ID = '2074090273450880'
const CAPI_TOKEN =
  process.env.META_CAPI_TOKEN ||
  'EAAOeVkcb5FABRilrweb1Fi6WdNtT0hnLb4HqZCWBUMwB5XSxCZCjTsuVaCc2b7BAoTOlHBBMBi2hts1Bav5T9mDzKZAwrUqnwZABl6u6JcGwjSv0aoeUVe483Q5lBmIyLwPvJGzj6TGv1teQTp3r8iSeLfh9Yvg1Vygdq1mmGYJemLFWZA60It0boprID4QYZApgZDZD'
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
