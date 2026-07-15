import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import { createServerClient } from "@/lib/supabase"

/**
 * TEMPORAL — BORRAR TRAS USAR. Prueba E2E del flujo de restablecer contraseña
 * sobre un usuario DESECHABLE (no toca cuentas reales): crea el usuario, pide
 * código (inserta fila), fija un código conocido, verifica → token, cambia la
 * clave y confirma que el login funciona con la NUEVA clave. Luego borra todo.
 */
const SECRET = "e7d1b9a4c60f2358"
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex")

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("key") !== SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const base = new URL(req.url).origin
  const db = createServerClient()
  const email = `pwreset.test.${Math.floor(Math.random() * 1e9)}@example.com`
  const oldPass = "OldPass_123"
  const newPass = "NuevaClave_456"
  const steps: Record<string, string> = {}
  let userId: string | null = null

  try {
    // 1) crear usuario desechable (confirmado, para poder loguear)
    const created = await db.auth.admin.createUser({ email, password: oldPass, email_confirm: true })
    userId = created.data.user?.id ?? null
    steps["1_crear_usuario"] = userId ? "ok" : "FALLO"
    if (!userId) throw new Error("no se creó el usuario")

    // 2) pedir código (endpoint real) — inserta una fila de código
    const r1 = await fetch(`${base}/api/auth/password/request`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
    })
    steps["2_request"] = r1.ok ? "ok" : "FALLO"

    // 3) fijar un código CONOCIDO (no podemos leer el plaintext del enviado)
    await db.from("password_reset_codes").update({ consumed: true }).eq("email", email).eq("consumed", false)
    await db.from("password_reset_codes").insert({
      email, code_hash: sha256("246810"), expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    })

    // 4) verificar con código correcto → token
    const r2 = await fetch(`${base}/api/auth/password/verify`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code: "246810" }),
    })
    const d2 = await r2.json().catch(() => ({}))
    steps["4_verify"] = r2.ok && d2.token ? "ok (token emitido)" : "FALLO"

    // 4b) verificar con código MALO debe fallar
    const rBad = await fetch(`${base}/api/auth/password/verify`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code: "000000" }),
    })
    steps["4b_codigo_malo_rechazado"] = rBad.ok ? "FALLO (aceptó código malo)" : "ok (rechazado)"

    // 5) cambiar la clave con el token
    const r3 = await fetch(`${base}/api/auth/password/reset`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: d2.token, password: newPass }),
    })
    steps["5_reset"] = r3.ok ? "ok" : "FALLO"

    // 6) confirmar que el login funciona con la NUEVA clave (y no la vieja)
    const loginNew = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
      body: JSON.stringify({ email, password: newPass }),
    })
    steps["6_login_clave_nueva"] = loginNew.ok ? "ok (la clave SÍ cambió en la BD)" : "FALLO"
    const loginOld = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
      body: JSON.stringify({ email, password: oldPass }),
    })
    steps["6b_clave_vieja_ya_no_sirve"] = loginOld.ok ? "FALLO (la vieja aún sirve)" : "ok (rechazada)"

    return NextResponse.json({ email, steps })
  } catch (err) {
    steps["error"] = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ email, steps }, { status: 500 })
  } finally {
    // 7) limpiar: borrar usuario + códigos
    try { await db.from("password_reset_codes").delete().eq("email", email) } catch {}
    try { if (userId) await db.auth.admin.deleteUser(userId) } catch {}
  }
}
