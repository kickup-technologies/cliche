import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase/server"

/**
 * Callback de verificación de correo / OAuth. Supabase redirige aquí con un
 * `code`; lo canjeamos por la sesión (cookies) y mandamos a la cuenta.
 */
/**
 * Solo permitimos redirigir a rutas internas propias. Un `next` como
 * "//evil.com" o "/\evil.com" o "https://evil.com" lo interpretaría el
 * navegador como otro host (open redirect / phishing): exigimos que empiece
 * por "/" y NO por "//" ni "/\". Cualquier otra cosa cae a la home.
 */
function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/")) return "/"
  if (next.startsWith("//") || next.startsWith("/\\")) return "/"
  return next
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = safeNext(searchParams.get("next"))

  if (code) {
    const supabase = await getSupabaseServer()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }
  return NextResponse.redirect(`${origin}/cuenta?error=verificacion`)
}
