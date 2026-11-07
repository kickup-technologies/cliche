/**
 * Aviso de Navidad: el último día para pedir y recibir antes del 24. Lo usan
 * la barra de anuncios, la tienda y la cuenta regresiva del checkout. Para
 * apagarlo después de la fecha, `activo: false`.
 */
export const AVISO_NAVIDAD = {
  activo: true,
  fechaLimite: "jueves 10 de diciembre",
  fechaCorta: "10 de diciembre",
  /** Fin del último día para pedir (para la cuenta regresiva del checkout). */
  hasta: Date.parse("2026-12-11T00:00:00-05:00"),
} as const
