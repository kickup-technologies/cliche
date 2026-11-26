import { filas, sesion } from '@/lib/bodega/datos';
import { TableroBodega } from './tablero';

export const dynamic = 'force-dynamic';

/** /bodega: los pedidos reales con lo que hay que alistar, la huella del comprador y la transportadora más barata. */
export default async function Bodega() {
  // Cada página revisa la sesión: Next puede renderizar solo la página sin pasar por el layout.
  if (!(await sesion())) return null;
  return <TableroBodega filas={await filas()} />;
}
