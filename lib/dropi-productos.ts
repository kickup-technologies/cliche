/**
 * Aroma del sitio (slug) → producto en Dropi (cuenta Bienestar by Cliché,
 * bodega 37902). Los kits se despachan como N unidades del mismo aroma.
 * Se llena con los ID que entrega Dropi al crear cada producto.
 */
export const PRODUCTOS_DROPI: Record<string, { id: number; nombre: string }> = {}
