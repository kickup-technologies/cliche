import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { runPaymentSafetyNet } from "@/lib/orders/reconcile"

/**
 * GET /api/cron/reconcile  — disparado por Vercel Cron (cada hora).
 *
 * Red de seguridad automática de pagos: confirma cualquier pedido "pending"
 * cuyo pago SÍ esté aprobado en Mercado Pago, sin esperar al webhook ni a que
 * alguien pulse "Reconciliar pagos" en el panel.
 *
 * Nació del incidente del 2026-07-28: un pago por botón Bancolombia de
 * $151.000 quedó aprobado en MP pero el webhook (roto por la redirección 308
 * del dominio apex) nunca lo confirmó, y la venta fue invisible hasta que la
 * clienta avisó. Con este cron, el peor caso pasa de "nunca" a "una hora".
 *
 * Protegido por CRON_SECRET (fail-closed, igual que los demás crons).
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    return NextResponse.json({ error: "MERCADOPAGO_ACCESS_TOKEN no configurado" }, { status: 503 })
  }

  try {
    const summary = await runPaymentSafetyNet(createServerClient())
    if (summary.confirmed > 0) {
      // Señal visible en los logs de Vercel: el cron rescató ventas que el
      // webhook había perdido — conviene investigar por qué falló el webhook.
      console.error(`[cron reconcile] RESCATE: ${summary.confirmed} pedido(s) pagados sin confirmar:`, summary.confirmedRefs.join(", "))
    }
    return NextResponse.json(summary)
  } catch (err) {
    console.error("[cron reconcile]", err)
    return NextResponse.json({ error: "Error reconciliando" }, { status: 500 })
  }
}
