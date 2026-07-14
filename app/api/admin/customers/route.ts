import { NextRequest, NextResponse } from "next/server"
import type { User } from "@supabase/supabase-js"
import { createServerClient } from "@/lib/supabase"
import { isAdmin } from "@/lib/admin-auth"
import { SPENT_STATUSES } from "@/lib/loyalty"

/**
 * GET /api/admin/customers
 * Vista CRM: todas las cuentas registradas (Supabase Auth) con su actividad
 * de compra agregada. Las cuentas NO viven en una tabla pública — se leen con
 * la API admin de auth (requiere service role). Protegido por la cookie
 * firmada del panel (isAdmin): son datos personales de clientes.
 */

type Activity = { count: number; spent: number; last: string | null }

const emptyActivity = (): Activity => ({ count: 0, spent: 0, last: null })

function mergeActivity(a?: Activity, b?: Activity): Activity {
  return {
    count: (a?.count || 0) + (b?.count || 0),
    spent: (a?.spent || 0) + (b?.spent || 0),
    last: [a?.last, b?.last].filter(Boolean).sort().pop() || null,
  }
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  try {
    const db = createServerClient()

    // ── Cuentas registradas (paginado defensivo; tope 5.000 cuentas) ──
    const users: User[] = []
    for (let page = 1; page <= 5; page++) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 })
      if (error) {
        console.error("[admin/customers] listUsers:", error.message)
        return NextResponse.json(
          { error: "No se pudieron cargar las cuentas. Verifica SUPABASE_SERVICE_ROLE_KEY en el entorno." },
          { status: 500 }
        )
      }
      users.push(...(data?.users ?? []))
      if (!data || data.users.length < 1000) break
    }

    // ── Actividad de compra + suscripción al correo ──
    // Los "pending" se excluyen: se crean al INICIAR el checkout, no son pedidos.
    const [{ data: orders }, { data: subs }] = await Promise.all([
      db.from("orders").select("user_id, customer_email, total, status, created_at").neq("status", "pending"),
      db.from("subscribers").select("email"),
    ])

    const subscribed = new Set((subs || []).map((s) => String(s.email || "").toLowerCase()))

    // Pedidos con user_id pertenecen a la cuenta; los de invitado (sin user_id)
    // se vinculan por correo — así el CRM muestra TODO lo que compró la persona.
    const byUser = new Map<string, Activity>()
    const byEmail = new Map<string, Activity>()
    for (const o of orders || []) {
      const key = o.user_id ? byUser : byEmail
      const id = o.user_id || String(o.customer_email || "").toLowerCase()
      if (!id) continue
      const agg = key.get(id) || emptyActivity()
      agg.count += 1
      if (SPENT_STATUSES.includes(o.status)) agg.spent += Number(o.total) || 0
      if (!agg.last || o.created_at > agg.last) agg.last = o.created_at
      key.set(id, agg)
    }

    const customers = users
      .map((u) => {
        const meta = (u.user_metadata || {}) as Record<string, string | undefined>
        const email = (u.email || "").toLowerCase()
        const activity = mergeActivity(byUser.get(u.id), email ? byEmail.get(email) : undefined)
        return {
          id: u.id,
          email: u.email || "",
          name: meta.full_name || [meta.first_name, meta.last_name].filter(Boolean).join(" ") || null,
          phone: meta.phone || null,
          birthdate: meta.birthdate || null,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at || null,
          confirmed: !!u.email_confirmed_at,
          orders_count: activity.count,
          total_spent: activity.spent,
          last_order_at: activity.last,
          subscribed: subscribed.has(email),
        }
      })
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1)) // más recientes primero

    return NextResponse.json({ customers })
  } catch (err) {
    console.error("[admin/customers]", err)
    return NextResponse.json({ error: "Error cargando clientes" }, { status: 500 })
  }
}
