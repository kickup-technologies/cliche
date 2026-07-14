import { NextRequest, NextResponse } from 'next/server'
import { sendCAPIEvents, CAPIUserData, CAPICustomData, hashValue, normalizePhone } from '@/lib/meta-capi'
import { rateLimit } from '@/lib/rate-limit'

/**
 * POST /api/capi
 *
 * Recibe eventos desde el cliente y los reenvía a la Conversions API de Meta.
 * El hashing de email/teléfono ocurre AQUÍ (servidor), nunca en el cliente,
 * para cumplir con la spec de Advanced Matching de Meta y con Ley 1581/2012.
 *
 * Campos especiales del body (NO son CAPIUserData estándar, se hashean aquí):
 *   user_data.raw_email  → se hashea y se mete en user_data.em
 *   user_data.raw_phone  → se normaliza, hashea y se mete en user_data.ph
 */

interface IncomingUserData extends Partial<CAPIUserData> {
  raw_email?: string
  raw_phone?: string
}

export async function POST(req: NextRequest) {
  // Anti-spam: máx. 30 eventos por IP por minuto
  const limited = rateLimit(req, { id: 'capi', limit: 30, windowMs: 60_000 })
  if (limited) return limited

  // Consentimiento: si el usuario rechazó cookies de marketing (cookie replicada
  // desde el banner), no reenviamos nada a Meta. 204 = aceptado pero sin acción.
  if (req.cookies.get('cliche_marketing_consent')?.value === '0') {
    return new NextResponse(null, { status: 204 })
  }

  try {
    const body = await req.json()
    const { event_name, event_source_url, event_id, user_data, custom_data } = body as {
      event_name: string
      event_source_url: string
      event_id: string
      user_data?: IncomingUserData
      custom_data?: CAPICustomData
    }

    // Enrich con datos server-side (no bloqueables por AdBlock/iOS)
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      ''
    const userAgent = req.headers.get('user-agent') || ''

    // Advanced Matching — hashear email y teléfono en el servidor
    const { raw_email, raw_phone, ...safeUserData } = user_data || {}
    const em: string[] = safeUserData.em ? [...safeUserData.em] : []
    const ph: string[] = safeUserData.ph ? [...safeUserData.ph] : []

    if (raw_email) {
      const hashed = hashValue(raw_email)
      if (!em.includes(hashed)) em.push(hashed)
    }
    if (raw_phone) {
      const normalized = normalizePhone(raw_phone)
      if (normalized) {
        const hashed = hashValue(normalized)
        if (!ph.includes(hashed)) ph.push(hashed)
      }
    }

    const enrichedUserData: CAPIUserData = {
      client_ip_address: ip,
      client_user_agent: userAgent,
      ...safeUserData,
      ...(em.length > 0 && { em }),
      ...(ph.length > 0 && { ph }),
    }

    const result = await sendCAPIEvents([
      {
        event_name,
        event_time: Math.floor(Date.now() / 1000),
        event_source_url,
        event_id,
        action_source: 'website',
        user_data: enrichedUserData,
        custom_data,
      },
    ])

    return NextResponse.json({ ok: true, result })
  } catch (err) {
    console.error('[CAPI route] error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
