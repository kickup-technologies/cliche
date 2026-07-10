import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { sendWelcomeEmail } from "@/lib/mailer"
import { rateLimit } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  // Anti-spam: máx. 5 suscripciones por IP cada 10 minutos
  const limited = rateLimit(req, { id: "subscribe", limit: 5, windowMs: 10 * 60_000 })
  if (limited) return limited

  try {
    const { email, source = "newsletter" } = await req.json()

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 })
    }

    const supabase = createServerClient()

    // Verificar si ya existe
    const { data: existing } = await supabase
      .from("subscribers")
      .select("id, discount_code")
      .eq("email", email)
      .single()

    if (existing) {
      // Ya estaba suscrito: le REENVIAMOS su código (antes respondíamos "listo"
      // sin enviar nada, y el usuario esperaba un correo que nunca llegaba).
      const code = existing.discount_code || "BIENVENIDA10"
      await sendWelcomeEmail(email, code)
      return NextResponse.json({
        success: true,
        message: "Ya estabas suscrito — te reenviamos tu código",
        discount_code: code,
      })
    }

    // Código de descuento REAL (debe existir en la tabla discount_codes para que
    // funcione en el checkout). El popup de captura entrega 20%; el resto, 10%.
    const discountCode = source === "popup" || source === "exit-intent" ? "BIENVENIDA20" : "BIENVENIDA10"

    // Guardar en Supabase
    const { error } = await supabase.from("subscribers").insert({
      email,
      source,
      discount_code: discountCode,
    })

    if (error) throw error

    // Enviar email de bienvenida con código
    await sendWelcomeEmail(email, discountCode)

    return NextResponse.json({
      success: true,
      message: "¡Suscrito exitosamente!",
      discount_code: discountCode,
    })
  } catch (err) {
    console.error("Subscribe error:", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
