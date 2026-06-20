import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase/server"

/**
 * Callback de verificación de correo / OAuth. Supabase redirige aquí con un
 * `code`; lo canjeamos por la sesión (cookies) y mandamos a la cuenta.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/cuenta"

  if (code) {
    const supabase = await getSupabaseServer()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}?verificado=1`)
  }
  return NextResponse.redirect(`${origin}/cuenta?error=verificacion`)
}
