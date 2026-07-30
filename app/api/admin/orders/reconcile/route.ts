import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { isAdmin } from "@/lib/admin-auth"
import { runPaymentSafetyNet } from "@/lib/orders/reconcile"

/**
 * POST /api/admin/orders/reconcile
 *
 * Reconciliación de pagos: recorre los pedidos "pending" y le pregunta a
 * Mercado Pago (con el access token) si cada uno tiene un pago APROBADO. Los que
 * sí, se confirman (idempotente, mismas acciones que el webhook: stock, correos,
 * alerta admin). Es la red de seguridad definitiva: recupera cualquier pago que
 * el webhook no haya confirmado, sin tocar los intentos realmente abandonados.
 */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    return NextResponse.json({ error: "MERCADOPAGO_ACCESS_TOKEN no configurado" }, { status: 503 })
  }

  try {
    const summary = await runPaymentSafetyNet(createServerClient())
    return NextResponse.json(summary)
  } catch (err) {
    console.error("[reconcile]", err)
    return NextResponse.json({ error: "Error reconciliando" }, { status: 500 })
  }
}
