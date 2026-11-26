import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';
import { leerDropi, guardarDropi, secreto } from './almacen';
import { MARCA } from './marca';

/**
 * Conexión del panel con Dropi por su servidor MCP (mcp.dropi.co), con la autorización estándar
 * (OAuth con PKCE): quien administra el panel entra a Dropi una vez y la aprueba. El panel SOLO
 * llama las consultas de HERRAMIENTAS; crear o cambiar órdenes no se puede desde aquí.
 */
const BASE = 'https://mcp.dropi.co';
const RECURSO = `${BASE}/mcp`;
/** Solo permisos de lectura. */
const PERMISOS = () => (process.env.DROPI_PERMISOS ?? '').trim() || 'read:inventory read:orders read:reports';
export const HERRAMIENTAS = ['get_customer_fingerprint_profile', 'search_cities', 'quote_shipping', 'list_orders'] as const;
export type Herramienta = (typeof HERRAMIENTAS)[number];

export class DropiDesconectado extends Error {
  constructor(motivo = 'Dropi está desconectado: usa «Conectar Dropi» en el menú de la bodega.') { super(motivo) }
}

export type ConexionDropi = {
  cliente?: string;
  /** Dirección de regreso con la que se registró el cliente. */
  regreso?: string;
  refresco?: string | null;
  acceso?: string | null;
  vence?: number;
  conectada?: string | null;
  pendiente?: { estado: string; verificador: string; vence: number } | null;
};

const llave = () => {
  if (!secreto()) throw new Error('Falta la llave del servidor');
  return createHmac('sha256', secreto()).update('dropi-conexion').digest();
};
export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', llave(), iv);
  const datos = Buffer.concat([c.update(texto, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), datos].map(b => b.toString('base64url')).join('.');
}
export function descifrar(sellado: string): string {
  const [iv, marca, datos] = sellado.split('.').map(s => Buffer.from(s, 'base64url'));
  const d = createDecipheriv('aes-256-gcm', llave(), iv);
  d.setAuthTag(marca);
  return Buffer.concat([d.update(datos), d.final()]).toString('utf8');
}

/** Regreso al mismo dominio desde el que se oprimió el botón (ahí está la sesión del panel). */
export const direccionDeRegreso = (origen?: string) => `${origen || ''}/bodega/dropi/callback`;

async function leer(): Promise<ConexionDropi> { return (await leerDropi()) ?? {} }

export async function estadoDropi() {
  const c = await leer();
  return { conectada: c.refresco ? (c.conectada ?? '') : null };
}

/** Registra el panel en Dropi (una vez) y devuelve la página donde se aprueba la conexión. */
export async function iniciarConexion(origen?: string): Promise<string> {
  const regreso = direccionDeRegreso(origen);
  if (!/^https:\/\/|^http:\/\/localhost/.test(regreso)) throw new Error('No pude saber la dirección del sitio');
  const c = await leer();
  let cliente = c.regreso === regreso ? c.cliente : undefined;
  if (!cliente) {
    const r = await fetch(`${BASE}/oauth/register`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({ client_name: `${MARCA.nombre} · Bodega`, redirect_uris: [regreso], grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], token_endpoint_auth_method: 'none', scope: PERMISOS() }),
    });
    const j = (await r.json().catch(() => ({}))) as { client_id?: string; error_description?: string; error?: string; message?: string };
    if (!r.ok || !j.client_id) throw new Error(`Dropi no aceptó registrar el panel (${r.status}): ${j.error_description ?? j.error ?? j.message ?? 'sin detalle'}`);
    cliente = j.client_id;
  }
  const verificador = randomBytes(32).toString('base64url');
  const estado = randomBytes(16).toString('base64url');
  await guardarDropi({ ...c, cliente, regreso, pendiente: { estado, verificador: cifrar(verificador), vence: Date.now() + 10 * 60_000 } });
  const q = new URLSearchParams({
    response_type: 'code', client_id: cliente, redirect_uri: regreso, state: estado, scope: PERMISOS(), resource: RECURSO,
    code_challenge: createHash('sha256').update(verificador).digest('base64url'), code_challenge_method: 'S256',
  });
  return `${BASE}/login/authorize?${q}`;
}

type Tokens = { access_token?: string; refresh_token?: string; expires_in?: number; error?: string; error_description?: string };
async function pedirTokens(datos: Record<string, string>): Promise<{ status: number; j: Tokens }> {
  const r = await fetch(`${BASE}/oauth/token`, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(20_000),
    body: new URLSearchParams({ ...datos, resource: RECURSO }).toString(),
  });
  return { status: r.status, j: (await r.json().catch(() => ({}))) as Tokens };
}
const conTokens = (c: ConexionDropi, j: Tokens): ConexionDropi => ({
  ...c,
  acceso: cifrar(j.access_token!),
  refresco: j.refresh_token ? cifrar(j.refresh_token) : c.refresco ?? null,
  vence: Date.now() + (Number(j.expires_in) || 300) * 1000,
});

/** El regreso desde Dropi con el código. */
export async function completarConexion(codigo: string, estado: string): Promise<void> {
  const c = await leer();
  const p = c.pendiente;
  if (!p || !c.cliente || !c.regreso || p.estado !== estado || p.vence < Date.now()) throw new Error('La solicitud de conexión venció o no coincide. Vuelve a oprimir «Conectar Dropi».');
  const { status, j } = await pedirTokens({ grant_type: 'authorization_code', code: codigo, redirect_uri: c.regreso, client_id: c.cliente, code_verifier: descifrar(p.verificador) });
  if (!j.access_token) throw new Error(`Dropi no entregó la autorización (${status}): ${j.error_description ?? j.error ?? 'sin detalle'}`);
  await guardarDropi({ ...conTokens(c, j), pendiente: null, conectada: new Date().toISOString() });
}

export async function desconectarDropi(): Promise<void> {
  const c = await leer();
  if (c.refresco && c.cliente) {
    await fetch(`${BASE}/oauth/revoke`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, cache: 'no-store', signal: AbortSignal.timeout(10_000), body: new URLSearchParams({ token: descifrar(c.refresco), client_id: c.cliente }).toString() }).catch(() => {});
  }
  await guardarDropi({ cliente: c.cliente, regreso: c.regreso });
}

let renovando: Promise<string> | null = null;
async function acceso(forzar = false): Promise<string> {
  const c = await leer();
  if (!forzar && c.acceso && (c.vence ?? 0) > Date.now() + 60_000) return descifrar(c.acceso);
  if (!c.refresco || !c.cliente) {
    if (!forzar && c.acceso && (c.vence ?? 0) > Date.now()) return descifrar(c.acceso);
    throw new DropiDesconectado();
  }
  // Dropi puede cambiar el token de refresco en cada uso: una sola renovación a la vez.
  renovando ??= (async () => {
    const { status, j } = await pedirTokens({ grant_type: 'refresh_token', refresh_token: descifrar(c.refresco!), client_id: c.cliente! });
    if (j.access_token) {
      await guardarDropi(conTokens(c, j));
      return j.access_token;
    }
    if (status === 400 || status === 401) {
      // Otra instancia pudo renovar primero: si el token guardado ya cambió, se usa el nuevo.
      const ahora = await leer();
      if (ahora.refresco && ahora.refresco !== c.refresco && ahora.acceso) return descifrar(ahora.acceso);
      await guardarDropi({ cliente: c.cliente, regreso: c.regreso });
      throw new DropiDesconectado('Dropi cerró la conexión: vuelve a conectarlo con «Conectar Dropi» en el menú de la bodega.');
    }
    throw new Error(`Dropi no respondió al renovar la conexión (${status}). Intenta de nuevo.`);
  })().finally(() => { renovando = null });
  return renovando;
}

type RespuestaRpc = { id?: number; result?: unknown; error?: { message?: string } };
async function leerRpc(r: Response, id: number): Promise<RespuestaRpc> {
  const cuerpo = await r.text();
  if ((r.headers.get('content-type') ?? '').includes('text/event-stream')) {
    for (const bloque of cuerpo.split(/\r?\n\r?\n/)) {
      const datos = bloque.split(/\r?\n/).filter(l => l.startsWith('data:')).map(l => l.slice(5).trim()).join('\n');
      if (!datos) continue;
      const m = JSON.parse(datos) as RespuestaRpc;
      if (m.id === id) return m;
    }
    throw new Error('Dropi no devolvió la respuesta esperada');
  }
  return JSON.parse(cuerpo) as RespuestaRpc;
}

export type Consultar = (herramienta: Herramienta, argumentos: Record<string, unknown>) => Promise<Record<string, unknown>>;
export class DropiRespuesta extends Error {}

/** Abre una sesión con Dropi y devuelve la función para consultar. */
export async function sesionDropi(): Promise<Consultar> {
  let token = await acceso();
  let sesion = '';
  let n = 0;
  const enviar = async (cuerpo: Record<string, unknown>) => {
    const hacer = () => fetch(RECURSO, {
      method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(30_000),
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...(sesion ? { 'mcp-session-id': sesion, 'mcp-protocol-version': '2025-06-18' } : {}) },
      body: JSON.stringify(cuerpo),
    });
    let r = await hacer();
    if (r.status === 401) { token = await acceso(true); r = await hacer() }
    if (r.status === 401) throw new DropiDesconectado('Dropi rechazó la conexión: vuelve a conectarlo con «Conectar Dropi» en el menú de la bodega.');
    if (r.status === 403) throw new Error('Dropi no dio permiso para esta consulta.');
    if (!r.ok) throw new Error(`Dropi respondió ${r.status}. Intenta de nuevo.`);
    return r;
  };
  const rpc = async (method: string, params: Record<string, unknown>) => {
    const id = ++n;
    const r = await enviar({ jsonrpc: '2.0', id, method, params });
    sesion ||= r.headers.get('mcp-session-id') ?? '';
    const m = await leerRpc(r, id);
    if (m.error) throw new Error(`Dropi: ${m.error.message ?? 'error'}`);
    return m.result;
  };
  await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'bodega', version: '1.0' } });
  await enviar({ jsonrpc: '2.0', method: 'notifications/initialized' });
  return async (herramienta, argumentos) => {
    if (!HERRAMIENTAS.includes(herramienta)) throw new Error('Consulta no permitida');
    const res = (await rpc('tools/call', { name: herramienta, arguments: argumentos })) as { content?: { type: string; text?: string }[]; structuredContent?: Record<string, unknown>; isError?: boolean };
    const texto = (res.content ?? []).map(c => c.text ?? '').join('\n').trim();
    if (res.isError) throw new DropiRespuesta(texto || 'Dropi devolvió un error');
    return res.structuredContent ?? leerResultado(texto);
  };
}

/** El texto de un resultado: JSON, o el formato compacto de Dropi («clave: valor» y tablas «nombre[N]{a,b}:»). */
export function leerResultado(texto: string): Record<string, unknown> {
  try {
    const j = JSON.parse(texto);
    if (j && typeof j === 'object') return j as Record<string, unknown>;
  } catch {}
  const celdas = (l: string) => (l.match(/("(?:[^"\\]|\\.)*"|[^,]*)(,|$)/g) ?? []).map(c => c.replace(/,$/, '').trim());
  const valor = (v: string): unknown => {
    if (v.startsWith('"')) { try { return JSON.parse(v) } catch { return v.slice(1, -1) } }
    if (v === 'null') return null;
    if (v === 'true' || v === 'false') return v === 'true';
    return v !== '' && Number.isFinite(Number(v)) ? Number(v) : v;
  };
  const salida: Record<string, unknown> = {};
  const lineas = texto.split(/\r?\n/);
  for (let i = 0; i < lineas.length; i++) {
    const tabla = lineas[i].match(/^(\w+)\[(\d+)\]\{([^}]*)\}:\s*$/);
    if (tabla) {
      const [, nombre, cuantas, campos] = tabla;
      const cols = campos.split(',').map(s => s.trim());
      salida[nombre] = lineas.slice(i + 1, i + 1 + Number(cuantas)).map(l => {
        const c = celdas(l.trim());
        return Object.fromEntries(cols.map((k, j) => [k, valor(c[j] ?? '')]));
      });
      i += Number(cuantas);
      continue;
    }
    const par = lineas[i].match(/^(\w+):\s*(.*)$/);
    if (par && par[2] !== '') salida[par[1]] = valor(par[2]);
  }
  // Una frase suelta (por ejemplo «No se encontró huella…») se devuelve tal cual.
  return Object.keys(salida).length ? salida : { texto };
}
