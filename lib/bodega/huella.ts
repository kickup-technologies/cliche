import { DropiRespuesta, type Consultar } from './dropi-mcp';
import type { CotizacionEnvio, HuellaDropi } from './reglas';

export type ParaVerificar = { celular: string; ciudad: string; departamento: string; contraentrega: boolean; productos: { id: number; type: 'SIMPLE'; quantity: number; price: number }[] };

/** Id de departamento en Dropi (list_departments, Colombia). */
const DEPARTAMENTO: Record<string, number> = {
  META: 1, CUNDINAMARCA: 3, 'BOGOTA D.C.': 3, BOGOTA: 3, CESAR: 4, CALDAS: 5, CASANARE: 7, SANTANDER: 8, 'LA GUAJIRA': 9, TOLIMA: 11, 'VALLE DEL CAUCA': 12, VALLE: 12,
  ANTIOQUIA: 13, BOYACA: 15, MAGDALENA: 16, 'NORTE DE SANTANDER': 17, BOLIVAR: 18, QUINDIO: 19, CORDOBA: 20, RISARALDA: 21, ATLANTICO: 22, CAUCA: 28, SUCRE: 34,
  CAQUETA: 38, ARAUCA: 39, NARINO: 40, HUILA: 49, GUAVIARE: 51, CHOCO: 54, VAUPES: 64, PUTUMAYO: 67, VICHADA: 70, AMAZONAS: 81, 'SAN ANDRES Y PROVIDENCIA': 91, GUAINIA: 92,
};

const sinTildes = (v: string) => (v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase();

async function huellaDe(consultar: Consultar, celular: string): Promise<HuellaDropi> {
  const consultada = new Date().toISOString();
  const sinRegistro: HuellaDropi = { tipo: 'Sin registro', riesgo: 'Probable', entrega: 0, devolucion: 0, consultada };
  try {
    const r = await consultar('get_customer_fingerprint_profile', { phone: celular });
    if (!r.risk_label) {
      if (/no se encontr/i.test(JSON.stringify(r))) return sinRegistro;
      throw new Error('Dropi no devolvió la huella.');
    }
    return { tipo: String(r.buyer_type ?? 'Sin dato'), riesgo: String(r.risk_label), entrega: Number(r.delivery_probability) || 0, devolucion: Number(r.return_probability) || 0, consultada };
  } catch (e) {
    if (e instanceof DropiRespuesta && /no se encontr[óo] huella/i.test(e.message)) return sinRegistro;
    throw e;
  }
}

type Ciudad = { id: number; department_id: number; name: string; cod_dane?: string | number };
type Opcion = { carrier: string; shipping_cost: number | null; insurance?: number | null; error?: string | null };

/** La transportadora más económica para el pedido (null con el motivo si no se puede cotizar). */
export async function cotizar(consultar: Consultar, pedido: ParaVerificar): Promise<{ cotizacion: CotizacionEnvio | null; aviso?: string }> {
  const nombre = sinTildes(pedido.ciudad).replace(/\s*D\.?\s?C\.?$/, '');
  if (!nombre) return { cotizacion: null, aviso: 'El pedido no tiene ciudad.' };
  if (!pedido.productos.length) return { cotizacion: null, aviso: 'La huella quedó guardada. El envío se cotiza cuando estos productos tengan su ID de Dropi.' };
  const halladas = ((await consultar('search_cities', { name: nombre })).items ?? []) as Ciudad[];
  const iguales = halladas.filter(c => sinTildes(String(c.name)) === nombre);
  const departamento = DEPARTAMENTO[sinTildes(pedido.departamento)];
  const ciudad = iguales.find(c => Number(c.department_id) === departamento) ?? (iguales.length === 1 && !departamento ? iguales[0] : undefined);
  if (!ciudad) return { cotizacion: null, aviso: `Dropi no reconoce la ciudad «${pedido.ciudad}» en ${pedido.departamento}: no se cotizó el envío.` };
  const dane = String(ciudad.cod_dane ?? '');
  const r = await consultar('quote_shipping', { destination_city: { id: Number(ciudad.id), zip_code: null, ...(dane ? { dane_code: dane.padStart(8, '0') } : {}) }, products: pedido.productos, cash_on_delivery: pedido.contraentrega });
  const opciones = ((r.carriers ?? []) as Opcion[])
    .filter(o => !o.error && o.shipping_cost !== null && Number(o.shipping_cost) > 0)
    .map(o => ({ transportadora: String(o.carrier), flete: Number(o.shipping_cost) + (Number(o.insurance) || 0) }))
    .sort((a, b) => a.flete - b.flete);
  if (!opciones.length) return { cotizacion: null, aviso: 'Ninguna transportadora cotizó este envío.' };
  return { cotizacion: { ...opciones[0], consultada: new Date().toISOString() } };
}

/** Huella del comprador y, si el pedido aún no está en Dropi, el flete más económico. */
export async function verificarEnDropi(consultar: Consultar, pedido: ParaVerificar, enDropi: boolean) {
  const celular = pedido.celular.replace(/\D/g, '').slice(-10);
  if (celular.length !== 10) throw new Error('El pedido no tiene un celular válido.');
  const huella = await huellaDe(consultar, celular);
  if (enDropi) return { huella, cotizacion: null, aviso: undefined };
  try {
    return { huella, ...(await cotizar(consultar, pedido)) };
  } catch (e) {
    return { huella, cotizacion: null, aviso: `La huella quedó guardada; el envío no se pudo cotizar (${e instanceof Error ? e.message.slice(0, 140) : 'error'}).` };
  }
}
