'use client';

import { useMemo, useState, useTransition } from 'react';
import { AlertTriangle, Boxes, MessageCircle, CheckCheck, ChevronDown, Download, Search, Send, ShieldAlert, ShieldCheck, Truck, X } from 'lucide-react';
import { NOMBRE_ETAPA, NOMBRE_SEMAFORO, colorDe, csvDespacho, picking, type EtapaBodega, type FilaBodega, type Semaforo } from '@/lib/bodega/reglas';
import { MARCA } from '@/lib/bodega/marca';
import { cambiarEtapa, confirmarDireccion, guardarGuiaNota, verificarHuella } from './acciones';

const cop = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;
const fecha = (iso: string) => new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
const normal = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const COLOR_RIESGO = (riesgo: string | undefined) => (riesgo === 'Segura' ? 'var(--verde)' : riesgo === 'Probable' ? '#c77d00' : riesgo === 'Riesgosa' ? 'var(--rojo)' : 'var(--gris)');
const CLASE_ETAPA: Record<EtapaBodega, string> = { por_alistar: 'estado-nuevo', alistado: 'estado-confirmado', despachado: 'estado-despachado' };

type Filtro = 'todos' | 'listos' | 'direccion' | 'confirmar' | 'detener' | 'alistados' | 'despachados';
const FILTROS: { id: Filtro; nombre: string; ok: (f: FilaBodega) => boolean }[] = [
  { id: 'todos', nombre: 'Por despachar', ok: f => f.etapa !== 'despachado' },
  { id: 'listos', nombre: 'Listos', ok: f => f.etapa !== 'despachado' && f.semaforo === 'listo' },
  { id: 'direccion', nombre: 'Confirmando dirección', ok: f => f.etapa !== 'despachado' && f.semaforo === 'direccion' },
  { id: 'confirmar', nombre: 'Por revisar', ok: f => f.etapa !== 'despachado' && (f.semaforo === 'confirmar' || f.semaforo === 'pendiente') },
  { id: 'detener', nombre: 'No despachar', ok: f => f.etapa !== 'despachado' && f.semaforo === 'detener' },
  { id: 'alistados', nombre: 'Alistados', ok: f => f.etapa === 'alistado' },
  { id: 'despachados', nombre: 'Despachados', ok: f => f.etapa === 'despachado' },
];

/** Consulta en Dropi la huella (y el flete) de un pedido. */
function BotonHuella({ referencia, repetir = false }: { referencia: string; repetir?: boolean }) {
  const [ocupado, empezar] = useTransition();
  const [mensaje, setMensaje] = useState<{ error: boolean; texto: string } | null>(null);
  const verificar = () => empezar(async () => {
    setMensaje(null);
    try {
      const r = await verificarHuella(referencia);
      if (!r.ok) setMensaje({ error: true, texto: r.error });
      else if (r.aviso) setMensaje({ error: false, texto: r.aviso });
    } catch {
      setMensaje({ error: true, texto: 'No se pudo consultar. Recarga la página e intenta de nuevo.' });
    }
  });
  return (
    <span className="bd-verificar" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
      <button type="button" className={repetir ? 'enlace' : 'boton claro'} disabled={ocupado} onClick={verificar}>
        <ShieldCheck size={14} aria-hidden="true" /> {ocupado ? 'Consultando…' : repetir ? 'Volver a verificar' : 'Verificar huella'}
      </button>
      {mensaje && <small role="status" style={{ color: mensaje.error ? 'var(--rojo)' : '#c77d00' }}>{mensaje.texto}</small>}
    </span>
  );
}

/** Aro de la huella: el porcentaje de entrega histórica del comprador, con el color de su riesgo. */
export function Aro({ valor, riesgo, tam = 40 }: { valor: number; riesgo?: string; tam?: number }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  return (
    <svg width={tam} height={tam} viewBox="0 0 44 44" role="img" aria-label={`Entrega histórica ${Math.round(valor)} %`} className="bd-aro">
      <circle cx="22" cy="22" r={r} fill="none" stroke="var(--linea-2)" strokeWidth="4" />
      <circle cx="22" cy="22" r={r} fill="none" stroke={COLOR_RIESGO(riesgo)} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(c * Math.max(0, Math.min(100, valor))) / 100} ${c}`} transform="rotate(-90 22 22)" />
      <text x="22" y="26" textAnchor="middle" fontSize="11" fontWeight="600" fill="currentColor">{Math.round(valor)}</text>
    </svg>
  );
}

const InsigniaSemaforo = ({ s }: { s: Semaforo }) => {
  const Icono = s === 'listo' ? ShieldCheck : s === 'detener' ? ShieldAlert : s === 'direccion' ? MessageCircle : AlertTriangle;
  return <span className={`insignia sem-${s}`}><Icono size={12} strokeWidth={2} aria-hidden="true" /> {NOMBRE_SEMAFORO[s]}</span>;
};

export function Aromas({ f, grande }: { f: FilaBodega; grande?: boolean }) {
  return (
    <div className={`bd-aromas${grande ? ' grande' : ''}`}>
      {f.alistar.items.map(i => (
        <span key={i.nombre} className="bd-aroma" title={i.nombre}>
          <i style={{ background: colorDe(i.nombre) }} aria-hidden="true" />
          <span className="txt">
            <span className="nom"><b>{i.qty}×</b> {i.nombre}</span>
            {i.ref && <small>{i.ref}</small>}
          </span>
        </span>
      ))}
    </div>
  );
}

/** Despachos: los pedidos reales con filtros, búsqueda y acciones en lote (el mismo estilo de la sección Pedidos del panel). */
export function TableroBodega({ filas }: { filas: FilaBodega[] }) {
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [abierto, setAbierto] = useState<string | null>(null);
  const [pedirOk, setPedirOk] = useState(false);
  const [ocupado, empezar] = useTransition();

  const cuenta = (id: Filtro) => filas.filter(FILTROS.find(x => x.id === id)!.ok).length;
  const visibles = useMemo(() => {
    const ok = FILTROS.find(x => x.id === filtro)!.ok;
    const n = normal(q.trim());
    const dig = q.replace(/\D/g, '');
    return filas.filter(ok).filter(f => !n || normal(`${f.ref} ${f.cliente} ${f.ciudad} ${f.direccion} ${f.orden}`).includes(n) || (dig.length >= 4 && f.celular.includes(dig)));
  }, [filas, filtro, q]);
  const elegidas = filas.filter(f => sel.has(f.id));
  const pk = picking(elegidas);
  const pendientes = filas.filter(f => f.etapa !== 'despachado');
  const flete = pendientes.reduce((n, f) => n + (f.cotizacion?.flete ?? 0), 0);
  const conFlete = pendientes.filter(f => f.cotizacion).length;
  const alertas = elegidas.filter(f => f.semaforo !== 'listo').length;
  const aRevisar = cuenta('direccion') + cuenta('confirmar') + cuenta('detener');

  const alternar = (id: string) => setSel(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n });
  const todosVisibles = visibles.length > 0 && visibles.every(f => sel.has(f.id));
  const marcarTodos = () => setSel(prev => { const n = new Set(prev); if (todosVisibles) visibles.forEach(f => n.delete(f.id)); else visibles.forEach(f => n.add(f.id)); return n });
  const mover = (etapa: EtapaBodega) => {
    if (etapa === 'despachado' && alertas && !pedirOk) { setPedirOk(true); return }
    setPedirOk(false);
    empezar(async () => { await cambiarEtapa([...sel], etapa); setSel(new Set()) });
  };
  const descargar = () => {
    const url = URL.createObjectURL(new Blob([csvDespacho(elegidas.length ? elegidas : visibles)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `despacho-${MARCA.corto}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <>
      <h1 className="titulo-2">Despachos</h1>
      <p className="bajada">Qué alistar en cada pedido, la huella del comprador en Dropi y la transportadora más económica. Selecciona varios para alistarlos o despacharlos en lote.</p>

      <div className="rejilla" style={{ marginTop: 24 }}>
        <div className="kpi"><span className="nombre"><Boxes size={15} strokeWidth={1.6} /> Por despachar</span><span className="cifra">{pendientes.length}</span><span className="nota">{picking(pendientes).total} unidades por alistar</span></div>
        <div className="kpi"><span className="nombre"><ShieldCheck size={15} strokeWidth={1.6} /> Listos</span><span className="cifra" style={{ color: 'var(--verde)' }}>{cuenta('listos')}</span><span className="nota">en Dropi, o confirmados y seguros</span></div>
        <div className="kpi"><span className="nombre"><MessageCircle size={15} strokeWidth={1.6} /> Por validar</span><span className="cifra" style={{ color: aRevisar ? '#c77d00' : undefined }}>{aRevisar}</span><span className="nota">{cuenta('direccion')} confirmando dirección · {cuenta('confirmar') + cuenta('detener')} por revisar</span></div>
        <div className="kpi"><span className="nombre"><Truck size={15} strokeWidth={1.6} /> Fletes estimados</span><span className="cifra">{cop(flete)}</span><span className="nota">{conFlete ? `promedio ${cop(flete / conFlete)}` : 'sin cotizar'}</span></div>
      </div>

      <div className="filtros">
        <nav className="segmento suave" aria-label="Filtro">
          {FILTROS.map(x => <button key={x.id} type="button" className={filtro === x.id ? 'activo' : ''} onClick={() => setFiltro(x.id)}>{x.nombre} <b>{cuenta(x.id)}</b></button>)}
        </nav>
        <div className="fila" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <label className="buscar">
            <Search size={16} strokeWidth={1.6} aria-hidden="true" />
            <span className="oculto">Buscar</span>
            <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Pedido, cliente, celular, ciudad o dirección" />
          </label>
          {q && <button type="button" className="enlace" onClick={() => setQ('')}><X size={13} aria-hidden="true" /> Quitar búsqueda</button>}
        </div>
      </div>

      {!visibles.length ? (
        <div className="tarjeta vacio">{filas.length ? 'Ningún pedido coincide con este filtro.' : 'Aún no hay pedidos. Aparecen aquí apenas la tienda registra uno.'}</div>
      ) : (
        <ul className="tarjeta tablero">
          <li className="fila-tablero bd titulos" aria-hidden="true">
            <span><input className="bd-check" type="checkbox" checked={todosVisibles} onChange={marcarTodos} aria-label="Seleccionar todos los visibles" /></span>
            <span>Pedido</span><span>Destino</span><span>Alistar</span><span>Huella Dropi</span><span>Envío</span><span>Estado</span><span />
          </li>
          {visibles.map(f => {
            const ab = abierto === f.id;
            const alternarAbierto = () => setAbierto(ab ? null : f.id);
            return (
              <li key={f.id} className={`bd-item${sel.has(f.id) ? ' marcado' : ''}`}>
                <div className="fila-tablero bd" role="button" tabIndex={0} aria-expanded={ab} onClick={alternarAbierto} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alternarAbierto() } }}>
                  <span onClick={e => e.stopPropagation()}><input className="bd-check" type="checkbox" checked={sel.has(f.id)} onChange={() => alternar(f.id)} aria-label={`Seleccionar ${f.ref}`} /></span>
                  <span><b className="mono">{f.ref}</b><small>{fecha(f.fecha)}</small></span>
                  <span><b>{f.ciudad || '—'}</b><small>{f.departamento}</small></span>
                  <span><Aromas f={f} /><small>{f.alistar.total} {f.alistar.total === 1 ? 'unidad' : 'unidades'} · {f.pagado ? 'pagado en línea' : 'contra entrega'}</small></span>
                  <span className="bd-huella">
                    {f.huella ? <><Aro valor={f.huella.entrega} riesgo={f.huella.riesgo} /><span><b style={{ color: COLOR_RIESGO(f.huella.riesgo) }}>{f.huella.riesgo}</b><small>{f.huella.tipo}</small></span></> : <BotonHuella referencia={f.id} />}
                  </span>
                  <span>{f.cotizacion ? <><b>{f.cotizacion.transportadora}</b><small>{cop(f.cotizacion.flete)}</small></> : <span className="gris">Sin cotizar</span>}{f.orden && <small className="bd-dropi">Dropi #{f.orden}</small>}</span>
                  <span><InsigniaSemaforo s={f.semaforo} /><small><span className={`insignia ${CLASE_ETAPA[f.etapa]}`} style={{ marginTop: 4 }}>{NOMBRE_ETAPA[f.etapa]}</span>{f.guia ? ` · Guía ${f.guia}` : ''}</small></span>
                  <ChevronDown size={16} className={`bd-flecha${ab ? ' gira' : ''}`} aria-hidden="true" />
                </div>
                {ab && <Detalle f={f} />}
              </li>
            );
          })}
        </ul>
      )}

      {sel.size > 0 && (
        <div className="bd-acciones" role="region" aria-label="Acciones en lote">
          {pedirOk ? (
            <>
              <span className="aviso-lote"><AlertTriangle size={16} aria-hidden="true" /> {alertas} de los seleccionados piden confirmar o no despachar. ¿Despachar de todos modos?</span>
              <button type="button" className="boton claro" onClick={() => setPedirOk(false)}>No, revisar</button>
              <button type="button" className="boton" disabled={ocupado} onClick={() => mover('despachado')}>Sí, despachar</button>
            </>
          ) : (
            <>
              <span className="resumen">
                <b>{sel.size} seleccionado{sel.size === 1 ? '' : 's'}</b>
                <small>Alistar: {pk.items.map(i => `${i.qty} ${i.nombre}`).join(' · ') || '—'}</small>
              </span>
              <button type="button" className="boton claro" onClick={descargar}><Download size={15} aria-hidden="true" /> Descargar listado</button>
              <button type="button" className="boton claro" disabled={ocupado} onClick={() => mover('alistado')}><CheckCheck size={15} aria-hidden="true" /> Marcar alistados</button>
              <button type="button" className="boton" disabled={ocupado} onClick={() => mover('despachado')}><Send size={15} aria-hidden="true" /> Marcar despachados</button>
              <button type="button" className="boton claro" disabled title="Se activa cuando Dropi habilite la API">Montar en Dropi · pronto</button>
              <button type="button" className="enlace" onClick={() => { setSel(new Set()); setPedirOk(false) }}>Limpiar</button>
            </>
          )}
        </div>
      )}
    </>
  );
}

function Detalle({ f }: { f: FilaBodega }) {
  const [orden, setOrden] = useState(f.orden);
  const [transportadora, setTransportadora] = useState(f.transportadora);
  const [guia, setGuia] = useState(f.guia);
  const [nota, setNota] = useState(f.nota);
  const [guardado, setGuardado] = useState(false);
  const [ocupado, empezar] = useTransition();
  const celular = f.celular.replace(/\D/g, '');
  const mensaje = `¡Hola ${f.cliente.split(' ')[0]}! Te escribimos de ${MARCA.nombre} por tu pedido #${f.ref}: ${f.alistar.items.map(i => `${i.qty}× ${i.nombre}`).join(', ')}. Va para ${[f.direccion, f.ciudad, f.departamento].filter(Boolean).join(', ')}. ¿Nos confirmas que los datos están correctos para despacharlo?`;
  return (
    <div className="bd-detalle">
      <div className="bd-col">
        <h3>Entregar a</h3>
        <p><b>{f.cliente || '—'}</b><br />{f.direccion || 'Sin dirección'}<br />{f.ciudad}{f.departamento ? ` (${f.departamento})` : ''}<br /><span className="mono">{f.celular}</span></p>
        <p className="bd-cobro">{f.pagado ? 'Pagado en línea' : 'Contra entrega'}</p>
        <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {celular && <a className="boton claro bd-imprimir" href={`https://wa.me/${celular.length === 10 ? `57${celular}` : celular}?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noreferrer"><MessageCircle size={15} aria-hidden="true" /> WhatsApp</a>}
          {!f.direccionConfirmada && <button type="button" className="boton claro bd-imprimir" disabled={ocupado} onClick={() => empezar(async () => { await confirmarDireccion(f.id) })}><CheckCheck size={15} aria-hidden="true" /> Dirección confirmada</button>}
        </p>
      </div>
      <div className="bd-col">
        <h3>Alistar</h3>
        <Aromas f={f} grande />
        <h3 style={{ marginTop: 14 }}>Transportadora</h3>
        {f.cotizacion ? <p><b>{f.cotizacion.transportadora}</b> · {cop(f.cotizacion.flete)} <span className="gris">(la más económica disponible)</span></p> : <p className="gris">Aún sin cotizar.</p>}
      </div>
      <div className="bd-col">
        <h3>Huella digital del comprador</h3>
        {f.huella ? (
          <div className="bd-huella-grande">
            <Aro valor={f.huella.entrega} riesgo={f.huella.riesgo} tam={72} />
            <div className="barras">
              <div><span>Entrega <b>{f.huella.entrega} %</b></span><div className="pista"><i style={{ width: `${f.huella.entrega}%`, background: 'var(--verde)' }} /></div></div>
              <div><span>Devolución <b>{f.huella.devolucion} %</b></span><div className="pista"><i style={{ width: `${f.huella.devolucion}%`, background: 'var(--rojo)' }} /></div></div>
              <small className="gris"><b style={{ color: COLOR_RIESGO(f.huella.riesgo) }}>{f.huella.riesgo}</b> · comprador {f.huella.tipo.toLowerCase()} · consultada {fecha(f.huella.consultada)}</small>
            </div>
          </div>
        ) : <p className="gris">La huella aún no se ha consultado en Dropi.</p>}
        <p style={{ margin: '10px 0' }}><BotonHuella referencia={f.id} repetir={!!f.huella} /></p>
        {f.motivos.length > 0 && <ul className="bd-motivos">{f.motivos.map(m => <li key={m}>{m}</li>)}</ul>}
      </div>
      <div className="bd-guia-auto">
        <h3>Guía de envío</h3>
        {f.orden && <p style={{ marginBottom: 6 }}>Orden Dropi <b className="mono">{f.orden}</b></p>}
        {f.guia ? <p className="ok"><b className="mono">{f.guia}</b>{f.transportadora ? ` · ${f.transportadora}` : ''}</p> : <p className="espera">{f.orden ? 'Guía pendiente en Dropi. El PDF se imprime desde Dropi (Órdenes) con ese número.' : 'Aparece cuando el pedido esté en Dropi y tenga guía.'}</p>}
      </div>
      <form className="bd-guia" onSubmit={e => { e.preventDefault(); empezar(async () => { await guardarGuiaNota(f.id, { orden, transportadora, guia, nota }); setGuardado(true); setTimeout(() => setGuardado(false), 2000) }) }}>
        <label>Orden Dropi<input className="campo" value={orden} onChange={e => setOrden(e.target.value)} maxLength={40} inputMode="numeric" placeholder="Número de orden" /></label>
        <label>Transportadora<select className="campo" value={transportadora} onChange={e => setTransportadora(e.target.value)}><option value="">Elegir</option>{MARCA.transportadoras.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></label>
        <label>Guía<input className="campo" value={guia} onChange={e => setGuia(e.target.value)} maxLength={80} placeholder="Número de guía" /></label>
        <label style={{ gridColumn: '1 / 3' }}>Nota del equipo<input className="campo" value={nota} onChange={e => setNota(e.target.value)} maxLength={500} placeholder="Ej.: llamé y confirmó la dirección" /></label>
        <button className="boton claro" type="submit" disabled={ocupado}>{guardado ? 'Guardado ✓' : ocupado ? 'Guardando…' : 'Guardar'}</button>
      </form>
    </div>
  );
}
