import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { sendWelcomeEmail } from "@/lib/resend"

export async function POST(req: NextRequest) {
  try {
    const { email, source = "newsletter" } = await req.json()

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 })
    }

    const supabase = createServerClient()

    // Verificar si ya existe
    const { data: existing } = await supabase
      .from("subscribers")
      .select("id")
      .eq("email", email)
      .single()

    if (existing) {
      return NextResponse.json({ success: true, message: "Ya estás suscrito" })
    }

    // Obtener código de descuento activo según la fuente
    const discountCode = source === "exit-intent" ? "QUEDATЕ15" : "PRIMERA20"

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
