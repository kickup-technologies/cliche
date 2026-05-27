import { NextRequest, NextResponse } from 'next/server'
import { sendCAPIEvents, CAPIUserData, CAPICustomData } from '@/lib/meta-capi'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { event_name, event_source_url, event_id, user_data, custom_data } = body as {
      event_name: string
      event_source_url: string
      event_id: string
      user_data?: Partial<CAPIUserData>
      custom_data?: CAPICustomData
    }

    // Enrich with server-side data (not blockeable by AdBlock/iOS)
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      ''
    const userAgent = req.headers.get('user-agent') || ''

    const result = await sendCAPIEvents([
      {
        event_name,
        event_time: Math.floor(Date.now() / 1000),
        event_source_url,
        event_id,
        action_source: 'website',
        user_data: {
          client_ip_address: ip,
          client_user_agent: userAgent,
          ...user_data,
        },
        custom_data,
      },
    ])

    return NextResponse.json({ ok: true, result })
  } catch (err) {
    console.error('[CAPI route] error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
