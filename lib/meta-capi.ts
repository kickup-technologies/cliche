/**
 * Meta Conversions API — server-side helper
 * Envía cada evento a TODOS los píxeles de lib/meta-pixels que tengan token:
 *   1083378614065362 (Cliché Web - Píxel)      → META_CAPI_TOKEN
 *   1193836337717040 (Píxel de Cliché OFICIAL)  → META_CAPI_TOKEN_OFICIAL
 * Mismo event_id en ambos → cada píxel deduplica contra su evento de navegador.
 *
 * Advanced Matching: hashing de email/teléfono con SHA-256 según spec de Meta.
 * El hashing ocurre SIEMPRE en el servidor — el email/teléfono crudo nunca
 * viaja directamente a Meta desde el navegador.
 */

import crypto from 'crypto'

// SECRETOS: solo desde variables de entorno. Nunca hardcodear un token aquí
// (queda en git y es robable). Un píxel sin token simplemente no recibe CAPI.
const DESTINATIONS: Array<{ pixelId: string; token: string | undefined }> = [
  { pixelId: '1083378614065362', token: process.env.META_CAPI_TOKEN },
  { pixelId: '1193836337717040', token: process.env.META_CAPI_TOKEN_OFICIAL },
]
const API_VERSION = 'v23.0'

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
  const targets = DESTINATIONS.filter((d) => d.token)
  if (!targets.length) {
    // Sin tokens configurados en el entorno → no se envían eventos server-side.
    return null
  }
  const results = await Promise.all(
    targets.map(async ({ pixelId, token }) => {
      try {
        const url = `https://graph.facebook.com/${API_VERSION}/${pixelId}/events?access_token=${token}`
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: events }),
          signal: AbortSignal.timeout(10_000),
        })
        const json = await res.json()
        // Sin esto, un token caducado (el de META_CAPI_TOKEN venció el
        // 2026-11-03) o un payload rechazado mataría los eventos server-side
        // EN SILENCIO: Meta responde con un objeto error. Queda en los logs.
        if (!res.ok || json?.error) {
          console.error(
            `[CAPI ${pixelId}] Meta rechazó ${events.map((e) => e.event_name).join(',')}:`,
            json?.error?.message || `HTTP ${res.status}`,
          )
        }
        return [pixelId, json] as const
      } catch (err) {
        console.error(`[CAPI ${pixelId}] Error sending event:`, err)
        return [pixelId, null] as const
      }
    }),
  )
  return Object.fromEntries(results)
}
