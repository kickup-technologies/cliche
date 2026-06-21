import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase/server"
import { createServerClient } from "@/lib/supabase"

/**
 * POST /api/account/delete
 * Elimina la cuenta del usuario AUTENTICADO (derecho de supresión, Ley 1581/2012).
 *
 * Seguridad: el usuario se identifica desde su sesión por cookies en el servidor
 * (no se confía en ningún id enviado por el cliente). Las operaciones de borrado
 * usan service_role.
 *
 * Qué se elimina:
 *  - La cuenta de autenticación (email, nombre, teléfono, direcciones y demás
 *    datos personales guardados en user_metadata).
 *  - El carrito del usuario.
 * Qué se conserva (obligación contable/fiscal, Ley colombiana — ver Política de
 * Privacidad): los pedidos ya realizados, pero DES-VINCULADOS de la cuenta
 * (user_id = null) para que dejen de estar asociados a un perfil.
 */
export async function POST() {
  // 1. Identificar al usuario por su sesión (servidor, seguro)
  const sb = await getSupabaseServer()
  const {
    data: { user },
  } = await sb.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const uid = user.id
  const admin = createServerClient() // service_role

  try {
    // 2. Borrar el carrito del usuario
    await admin.from("user_carts").delete().eq("user_id", uid)

    // 3. Des-vincular pedidos (se conservan por obligación fiscal, sin cuenta)
    await admin.from("orders").update({ user_id: null }).eq("user_id", uid)

    // 4. Eliminar la cuenta de autenticación (borra todos los datos personales)
    const { error } = await admin.auth.admin.deleteUser(uid)
    if (error) {
      console.error("[account/delete] deleteUser falló:", error.message)
      return NextResponse.json({ error: "No se pudo eliminar la cuenta" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[account/delete] error:", e)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
