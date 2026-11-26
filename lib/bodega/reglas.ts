/**
 * Panel de la bodega: lo que hay que alistar en cada pedido, la huella digital del comprador en Dropi
 * y la decisión de si se despacha. Sin nada del servidor: se usa también en el navegador.
 */
export type Item = { nombre: string; ref: string; qty: number }
export type Alistar = { items: Item[]; total: number }

const COLORES = ['#5f8a5a', '#c9a227', '#4a78c8', '#c46a86', '#8a6bb8', '#c8743f', '#3f9a9a', '#9a7b4f']
export const colorDe = (nombre: string) => COLORES[[...nombre].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7) % COLORES.length]

export type HuellaDropi = { tipo: string; riesgo: string; entrega: number; devolucion: number; consultada: string }
export type CotizacionEnvio = { transportadora: string; flete: number; consultada: string }
export type EtapaBodega = 'por_alistar' | 'alistado' | 'despachado'
/** Lo que anota la bodega sobre un pedido. */
export type EstadoBodega = {
  etapa?: EtapaBodega; nota?: string; guia?: string; transportadora?: string; orden?: string
  direccionConfirmada?: string; huella?: HuellaDropi; cotizacion?: CotizacionEnvio
}

export type Semaforo = 'listo' | 'direccion' | 'confirmar' | 'detener' | 'pendiente'
export const NOMBRE_SEMAFORO: Record<Semaforo, string> = { listo: 'Listo para despachar', direccion: 'Confirmando dirección', confirmar: 'Confirmar antes', detener: 'No despachar', pendiente: 'Huella sin consultar' }
export const NOMBRE_ETAPA: Record<EtapaBodega, string> = { por_alistar: 'Por alistar', alistado: 'Alistado', despachado: 'Despachado' }

/**
 * Semáforo del pedido. Detiene: comprador «Riesgosa». «Confirmando dirección»: aún no se confirma por WhatsApp.
 * Pide confirmar: «Probable» o sin historial. Con la orden ya creada en Dropi queda listo.
 */
export function revisar(o: { direccionConfirmada: boolean; huella: HuellaDropi | null; enDropi?: boolean }): { semaforo: Semaforo; motivos: string[] } {
  if (o.enDropi) {
    const info = ['Orden creada en Dropi: alistar y despachar.']
    if (!o.direccionConfirmada) info.push('La dirección no está marcada como confirmada; revisa que la guía salga con los datos de este pedido.')
    return { semaforo: 'listo', motivos: info }
  }
  const motivos: string[] = []
  let s: Semaforo = 'listo'
  const sube = (n: Semaforo) => { const orden: Semaforo[] = ['listo', 'pendiente', 'confirmar', 'direccion', 'detener']; if (orden.indexOf(n) > orden.indexOf(s)) s = n }
  const h = o.huella
  if (!h) { sube('pendiente'); motivos.push('La huella de Dropi aún no se ha consultado.') }
  else if (h.riesgo === 'Riesgosa') { sube('detener'); motivos.push(`Huella «Riesgosa»: ${h.devolucion} % de devolución. Llamar al cliente antes de enviar.`) }
  else if (h.riesgo === 'Probable') {
    sube('confirmar')
    motivos.push(h.entrega === 0 && h.devolucion === 0 ? 'Sin historial en Dropi: confirmar la dirección.' : `Huella «Probable»: entrega ${h.entrega} %, devolución ${h.devolucion} %.`)
  } else if (h.entrega > 0 && h.entrega < 80) motivos.push(`Entrega histórica de ${h.entrega} %, la más baja de los seguros.`)
  if (!o.direccionConfirmada) { sube('direccion'); motivos.push('Falta confirmar la dirección por WhatsApp. No despachar hasta que pase a «Listo».') }
  return { semaforo: s, motivos }
}

/** Una nota que empieza por «NO DESPACHAR» retiene el pedido. */
export const retenido = (nota: string | null | undefined) => /^\s*no despachar/i.test(nota ?? '')

export type FilaBodega = {
  id: string; ref: string; fecha: string
  cliente: string; celular: string; departamento: string; ciudad: string; direccion: string
  alistar: Alistar
  /** La bodega no ve montos del pedido: solo cómo paga. */
  pagado: boolean
  direccionConfirmada: boolean
  huella: HuellaDropi | null; cotizacion: CotizacionEnvio | null
  semaforo: Semaforo; motivos: string[]
  etapa: EtapaBodega; nota: string
  orden: string; transportadora: string; guia: string
}

export type PedidoBase = Pick<FilaBodega, 'id' | 'ref' | 'fecha' | 'cliente' | 'celular' | 'departamento' | 'ciudad' | 'direccion' | 'pagado'> & {
  items: Item[]
  /** La tienda ya lo tiene confirmado / despachado. */
  confirmado: boolean; despachado: boolean
  orden?: string; transportadora?: string; guia?: string
}

export function fila(p: PedidoBase, b: EstadoBodega = {}): FilaBodega {
  const direccionConfirmada = p.confirmado || !!b.direccionConfirmada
  const orden = b.orden || p.orden || ''
  let { semaforo, motivos } = revisar({ direccionConfirmada, huella: b.huella ?? null, enDropi: !!orden })
  if (retenido(b.nota)) { semaforo = 'detener'; motivos = [b.nota!] }
  const juntos = new Map<string, Item>()
  for (const i of p.items) juntos.set(i.nombre, { ...i, qty: (juntos.get(i.nombre)?.qty ?? 0) + i.qty })
  const items = [...juntos.values()]
  return {
    id: p.id, ref: p.ref, fecha: p.fecha, cliente: p.cliente, celular: p.celular, departamento: p.departamento, ciudad: p.ciudad, direccion: p.direccion, pagado: p.pagado,
    alistar: { items, total: items.reduce((n, i) => n + i.qty, 0) },
    direccionConfirmada, huella: b.huella ?? null, cotizacion: b.cotizacion ?? null, semaforo, motivos,
    etapa: p.despachado ? 'despachado' : b.etapa === 'alistado' ? 'alistado' : 'por_alistar', nota: b.nota ?? '',
    orden, transportadora: b.transportadora || p.transportadora || '', guia: b.guia || p.guia || '',
  }
}

/** Suma de lo que hay que alistar. */
export function picking(filas: FilaBodega[]) {
  const porProducto = new Map<string, Item>()
  for (const f of filas) for (const i of f.alistar.items) porProducto.set(i.nombre, { ...i, qty: (porProducto.get(i.nombre)?.qty ?? 0) + i.qty })
  const items = [...porProducto.values()].sort((a, b) => b.qty - a.qty || a.nombre.localeCompare(b.nombre))
  return { items, total: items.reduce((n, i) => n + i.qty, 0), pedidos: filas.length }
}

const celda = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`
/** CSV de despacho (con BOM para Excel). */
export function csvDespacho(filas: FilaBodega[]): string {
  const cab = ['Pedido', 'Fecha', 'Nombre', 'Celular', 'Departamento', 'Ciudad', 'Dirección', 'Despachar', 'Pago', 'Dirección confirmada', 'Huella Dropi', 'Entrega %', 'Devolución %', 'Transportadora', 'Flete', 'Semáforo', 'Etapa', 'Guía', 'Orden Dropi']
  const filasCsv = filas.map(f => [
    f.ref, f.fecha.slice(0, 10), f.cliente, f.celular, f.departamento, f.ciudad, f.direccion,
    f.alistar.items.map(i => `${i.qty} × ${i.nombre}`).join(' + '),
    f.pagado ? 'Pagado en línea' : 'Contra entrega', f.direccionConfirmada ? 'Sí' : 'No',
    f.huella?.riesgo ?? '', f.huella?.entrega ?? '', f.huella?.devolucion ?? '', f.transportadora || f.cotizacion?.transportadora || '', f.cotizacion?.flete ?? '', NOMBRE_SEMAFORO[f.semaforo], NOMBRE_ETAPA[f.etapa], f.guia, f.orden,
  ])
  return '﻿' + [cab, ...filasCsv].map(r => r.map(celda).join(',')).join('\r\n')
}
