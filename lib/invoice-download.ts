"use client"

import { adminFetch } from "@/lib/admin-client"

/**
 * Descarga la factura del pedido en PDF. Se pide por fetch (con la cookie del
 * panel) y se guarda desde un blob en vez de navegar a la URL: así funciona
 * igual dentro del panel embebido en la otra tienda, y un fallo se puede
 * explicar en vez de dejar una pestaña en blanco.
 */
export async function downloadInvoice(orderId: string, numero?: string): Promise<string | null> {
  try {
    const res = await adminFetch(`/api/admin/orders/${encodeURIComponent(orderId)}/invoice`)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      return d?.error || "No se pudo generar la factura."
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Factura-${numero || String(orderId).slice(0, 8).toUpperCase()}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    // Se libera cuando el navegador ya arrancó la descarga.
    setTimeout(() => URL.revokeObjectURL(url), 30_000)
    return null
  } catch {
    return "Error de conexión al generar la factura."
  }
}
