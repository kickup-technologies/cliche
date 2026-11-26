'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { actualizarPedido, paraVerificar, sesion } from '@/lib/bodega/datos';
import { guardarEstado, leerEstado } from '@/lib/bodega/almacen';
import { iniciarConexion, sesionDropi } from '@/lib/bodega/dropi-mcp';
import { verificarEnDropi } from '@/lib/bodega/huella';
import type { EtapaBodega } from '@/lib/bodega/reglas';

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function exigir(...ids: string[]) {
  if (!(await sesion())) throw new Error('Sin sesión');
  if (ids.some(i => !ID.test(i))) throw new Error('Pedido inválido');
}

const ETAPAS: EtapaBodega[] = ['por_alistar', 'alistado', 'despachado'];
/** Pasa varios pedidos a la misma etapa (alistado, despachado…). */
export async function cambiarEtapa(ids: string[], etapa: EtapaBodega) {
  const lista = [...new Set(ids)].slice(0, 200);
  await exigir(...lista);
  if (!ETAPAS.includes(etapa)) throw new Error('Etapa inválida');
  for (const id of lista) {
    await guardarEstado(id, { etapa });
    if (etapa !== 'por_alistar') await actualizarPedido(id, etapa === 'despachado' ? 'despachado' : 'confirmado', await leerEstado(id));
  }
  revalidatePath('/bodega');
}

export async function confirmarDireccion(id: string) {
  await exigir(id);
  await guardarEstado(id, { direccionConfirmada: new Date().toISOString() });
  await actualizarPedido(id, 'confirmado', await leerEstado(id));
  revalidatePath('/bodega');
}

export async function guardarGuiaNota(id: string, d: { orden: string; transportadora: string; guia: string; nota: string }) {
  await exigir(id);
  const limpio = (v: string, n: number) => String(v ?? '').trim().slice(0, n);
  const cambios = { orden: limpio(d.orden, 40), transportadora: limpio(d.transportadora, 30), guia: limpio(d.guia, 80), nota: limpio(d.nota, 500) };
  await guardarEstado(id, cambios);
  await actualizarPedido(id, null, await leerEstado(id));
  revalidatePath('/bodega');
}

export type ResultadoVerificar = { ok: true; aviso?: string } | { ok: false; error: string };
/** Botón «Verificar huella»: consulta en Dropi la huella del comprador y, si aún no hay orden, el flete. */
export async function verificarHuella(id: string): Promise<ResultadoVerificar> {
  await exigir(id);
  const p = await paraVerificar(id);
  if (!p) return { ok: false, error: 'No encontré ese pedido.' };
  try {
    const estado = await leerEstado(id);
    const { huella, cotizacion, aviso } = await verificarEnDropi(await sesionDropi(), p, !!estado.orden);
    await guardarEstado(id, { huella, ...(cotizacion ? { cotizacion } : {}) });
    revalidatePath('/bodega');
    return { ok: true, aviso };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo consultar en Dropi.' };
  }
}

/** Lleva a Dropi a aprobar la conexión (solo lectura). */
export async function conectarDropi() {
  await exigir();
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host') || '';
  const origen = `${host.startsWith('localhost') ? 'http' : 'https'}://${host}`;
  redirect(await iniciarConexion(origen));
}
