import { filas, sesion } from '@/lib/bodega/datos';
import { colorDe, picking } from '@/lib/bodega/reglas';
import { Aromas } from '../tablero';
import { BotonImprimir } from './imprimir';

export const dynamic = 'force-dynamic';

/** /bodega/picking: cuántas unidades de cada referencia hay que alistar para todo lo que falta despachar, y para quién. */
export default async function Picking() {
  if (!(await sesion())) return null;
  const pendientes = (await filas()).filter(f => f.etapa !== 'despachado');
  const pk = picking(pendientes);
  const orden = [...pendientes].sort((a, b) => a.fecha.localeCompare(b.fecha));
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="titulo-2">Picking</h1>
          <p className="bajada">Lo que hay que alistar para los {pk.pedidos} pedidos que faltan por despachar.</p>
        </div>
        <BotonImprimir />
      </div>
      <div className="bd-colores">
        {pk.items.map(i => (
          <div key={i.nombre} className="bd-pk" style={{ borderTopColor: colorDe(i.nombre) }}>
            <span className="n">{i.qty}</span>
            <span className="a">{i.nombre}</span>
            <span className="v">{i.ref}</span>
          </div>
        ))}
      </div>
      <p className="suave" style={{ marginTop: 16, fontSize: 14 }}>{pk.total} unidades en total.</p>
      <div className="tarjeta bd-pk-detalle">
        <h2>Pedido por pedido</h2>
        {!orden.length ? <p className="vacio">No hay pedidos pendientes.</p> : (
          <ul className="tablero" style={{ padding: 0 }}>
            {orden.map(f => (
              <li key={f.id}>
                <b className="mono">{f.ref}</b>
                <Aromas f={f} />
                <small>{f.ciudad}</small>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
