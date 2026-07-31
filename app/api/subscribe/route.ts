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
      // Ya estaba suscrito: NO se envía ningún correo de nuevo, solo se avisa.
      return NextResponse.json({
        success: false,
        alreadySubscribed: true,
        message: "Este correo ya está suscrito",
      })
    }

    // Sin código de bienvenida: se eliminó el 2026-07-30 por decisión del
    // negocio (antes BIENVENIDA10; BIENVENIDA20 ya se había quitado el
    // 2026-07-14). La suscripción ahora ofrece contenido y acceso anticipado.
    const { error } = await supabase.from("subscribers").insert({
      email,
      source,
    })

    if (error) throw error

    // Correo de bienvenida (sin código de descuento)
    await sendWelcomeEmail(email)

    return NextResponse.json({
      success: true,
      message: "¡Suscrito exitosamente!",
    })
  } catch (err) {
    console.error("Subscribe error:", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
