/**
 * Meta Conversions API — server-side helper
 * Pixel ID: 2074090273450880 | Dataset: Cliché Aromas
 */

const PIXEL_ID = '2074090273450880'
const CAPI_TOKEN =
  process.env.META_CAPI_TOKEN ||
  'EAAOeVkcb5FABRilrweb1Fi6WdNtT0hnLb4HqZCWBUMwB5XSxCZCjTsuVaCc2b7BAoTOlHBBMBi2hts1Bav5T9mDzKZAwrUqnwZABl6u6JcGwjSv0aoeUVe483Q5lBmIyLwPvJGzj6TGv1teQTp3r8iSeLfh9Yvg1Vygdq1mmGYJemLFWZA60It0boprID4QYZApgZDZD'
const API_VERSION = 'v19.0'

export interface CAPIUserData {
  client_ip_address?: string
  client_user_agent?: string
  em?: string[]   // hashed email
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
