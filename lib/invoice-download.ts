"use client"

import { adminFetch } from "@/lib/admin-client"

/**
 * Nombre del archivo que propone el servidor en Content-Disposition. Se
 * prefiere `filename*` (UTF-8, conserva las tildes del nombre de la persona)
 * y se cae a `filename` si no viene.
 */
function nombreDesdeCabecera(cd: string | null): string | null {
  if (!cd) return null
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(cd)
  if (utf8) { try { return decodeURIComponent(utf8[1]) } catch { /* sigue al respaldo */ } }
  const plano = /filename="([^"]+)"/i.exec(cd)
  return plano ? plano[1] : null
}

/**
 * Descarga la factura del pedido en PDF. Se pide por fetch (con la cookie del
 * panel) y se guarda desde un blob en vez de navegar a la URL: así funciona
 * igual dentro del panel embebido en la otra tienda, y un fallo se puede
 * explicar en vez de dejar una pestaña en blanco.
 *
 * El nombre del archivo lo decide el SERVIDOR (persona + fecha del pedido):
 * `a.download` pisa al de la cabecera, así que se lee de ahí para no tener
 * dos fuentes que se contradigan.
 */
export async function downloadInvoice(orderId: string): Promise<string | null> {
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
    a.download = nombreDesdeCabecera(res.headers.get("content-disposition")) || `Factura-${String(orderId).slice(0, 8).toUpperCase()}.pdf`
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
