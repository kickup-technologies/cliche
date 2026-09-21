import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { isAdmin } from "@/lib/admin-auth"
import { createServerClient } from "@/lib/supabase"
import { InvoiceDocument, invoiceFileName } from "@/lib/invoice-pdf"
import type { Order } from "@/app/admin-cliche-secret/types"

/**
 * GET /api/admin/orders/[id]/invoice — descarga la factura del pedido en PDF.
 * Se responde con Content-Disposition: attachment, así que el navegador la
 * GUARDA (no abre el diálogo de imprimir).
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  if (!id) return NextResponse.json({ error: "Falta el pedido" }, { status: 400 })

  try {
    const { data, error } = await createServerClient().from("orders").select("*").eq("id", id).maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 })

    const order = data as Order
    const pdf = await renderToBuffer(<InvoiceDocument order={order} />)
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        // filename= (ASCII, respaldo) + filename*= (UTF-8, con tildes): la
        // cabecera HTTP no admite caracteres no-ASCII en el atributo clásico.
        "Content-Disposition": `attachment; filename="${invoiceFileName(order).ascii}"; filename*=UTF-8''${encodeURIComponent(invoiceFileName(order).utf8)}`,
        "Cache-Control": "no-store",
      },
    })
  } catch (e) {
    console.error("[admin/orders/invoice]", e)
    return NextResponse.json({ error: "No se pudo generar la factura" }, { status: 500 })
  }
}
