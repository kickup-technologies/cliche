/**
 * Contra entrega (26-nov-2026): el pedido se registra sin pago, el equipo lo
 * confirma por WhatsApp, se despacha con Dropi y la transportadora recauda en
 * la puerta. Sin columnas nuevas en la base: se reconoce por la referencia
 * (`cliche_cod_…`) y nace con estado `cod_pending` (por confirmar).
 */
export const CONTRAENTREGA_ACTIVA = true

export const PREFIJO_COD = "cliche_cod_"
export const ESTADO_COD_NUEVO = "cod_pending"

export const esContraentrega = (referencia?: string | null) =>
  !!referencia && referencia.startsWith(PREFIJO_COD)

/** Celular colombiano: 10 dígitos que empiezan por 3 (con o sin +57). */
export const celularValido = (v: string) =>
  /^3\d{9}$/.test(v.replace(/\D/g, "").replace(/^57(?=3\d{9}$)/, ""))
