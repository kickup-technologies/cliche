import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { rateLimit } from "@/lib/rate-limit"

import { randomBytes } from "crypto"

/**
 * Código de referido ALEATORIO. Antes se derivaba del correo del comprador
 * (`email.split("@")[0]`), lo que filtraba un fragmento del correo/nombre a
 * quien recibiera el código. Ahora es aleatorio (sin PII) y con más entropía.
 */
function makeCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // sin O/0/I/1 (legibilidad)
  const bytes = randomBytes(8)
  let code = "CLICHE"
  for (let i = 0; i < 6; i++) code += alphabet[bytes[i] % alphabet.length]
  return code
}

export async function POST(req: NextRequest) {
  // Anti-abuso: máx. 5 generaciones de código por IP por minuto
  const limited = rateLimit(req, { id: "referral-generate", limit: 5, windowMs: 60_000 })
  if (limited) return limited

  try {
    const { session_id } = await req.json()
    if (!session_id) return NextResponse.json({ error: "session_id required" }, { status: 400 })

    const supabase = createServerClient()

    // Find the order to get the buyer's email
    const { data: order } = await supabase
      .from("orders")
      .select("id, customer_email, used_referral")
      .eq("stripe_session_id", session_id)
      .single()

    // El código de referido SOLO se emite para un pedido REAL con correo. Sin
    // esto, un session_id inventado se usaba como owner_email → cualquiera podía
    // sembrar filas basura en referral_codes con un "dueño" arbitrario.
    const ownerEmail = order?.customer_email
    if (!order || !ownerEmail) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 })
    }

    // Check if we already generated a referral code for this buyer
    const { data: existing } = await supabase
      .from("referral_codes")
      .select("code, discount_percent")
      .eq("owner_email", ownerEmail)
      .single()

    if (existing) {
      return NextResponse.json({ code: existing.code, discount_percent: existing.discount_percent })
    }

    // Create new referral code
    const code = makeCode()
    const discount_percent = 10

    const { error } = await supabase.from("referral_codes").insert({
      code,
      owner_email: ownerEmail,
      discount_percent,
      uses: 0,
    })

    if (error) throw error

    return NextResponse.json({ code, discount_percent })
  } catch (err) {
    console.error("[referral/generate]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
