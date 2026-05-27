import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// GET /api/settings — returns discount_percentage and discount_code
export async function GET() {
  try {
    const db = createServerClient()
    const { data, error } = await db
      .from('site_settings')
      .select('key, value')
      .in('key', ['discount_percentage', 'discount_code'])

    if (error) throw error

    const settings: Record<string, string> = {}
    for (const row of data ?? []) {
      settings[row.key] = row.value
    }

    return NextResponse.json({
      discount_percentage: Number(settings.discount_percentage ?? 10),
      discount_code: settings.discount_code ?? 'BIENVENIDA10',
    })
  } catch (err) {
    console.error('[settings GET]', err)
    return NextResponse.json({ discount_percentage: 10, discount_code: 'BIENVENIDA10' })
  }
}

// PUT /api/settings — updates discount_percentage and/or discount_code
export async function PUT(req: NextRequest) {
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
