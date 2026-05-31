import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { rateLimit } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  // Anti-fuerza-bruta de códigos: máx. 20 intentos por IP por minuto
  const limited = rateLimit(req, { id: "discount-validate", limit: 20, windowMs: 60_000 })
  if (limited) return limited

  try {
    const { code, email, subtotal } = await req.json()

    if (!code || !subtotal || subtotal <= 0) {
      return NextResponse.json({ valid: false, error: "Datos inválidos" }, { status: 400 })
    }

    const db = createServerClient()

    // Buscar el código
    const { data: discount, error } = await db
      .from("discount_codes")
      .select("*")
      .eq("code", code.toUpperCase().trim())
      .single()

    if (error || !discount) {
      return NextResponse.json({ valid: false, error: "Código de descuento no encontrado" })
    }

    // Validar activo
    if (!discount.is_active) {
      return NextResponse.json({ valid: false, error: "Este código no está activo" })
    }

    // Validar expiración
    if (discount.expires_at && new Date(discount.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: "Este código ha expirado" })
    }

    // Validar usos máximos
    if (discount.max_uses !== null && discount.uses_count >= discount.max_uses) {
      return NextResponse.json({ valid: false, error: "Este código ya alcanzó su límite de usos" })
    }

    // Validar que el email no haya usado el código antes
    if (email) {
      const { data: redemption } = await db
        .from("code_redemptions")
        .select("id")
        .eq("code_id", discount.id)
        .eq("customer_email", email)
        .single()

      if (redemption) {
        return NextResponse.json({ valid: false, error: "Ya usaste este código anteriormente" })
      }
    }

    // Calcular descuento
    let discount_amount = 0
    if (discount.type === "percentage") {
      discount_amount = Math.round((subtotal * discount.value) / 100)
    } else {
      discount_amount = Math.min(discount.value, subtotal)
    }

    return NextResponse.json({
      valid: true,
      type: discount.type,
      value: discount.value,
      discount_amount,
    })
  } catch (err) {
    console.error("[discount/validate] error:", err)
    return NextResponse.json({ valid: false, error: "Error al validar el código" }, { status: 500 })
  }
}
