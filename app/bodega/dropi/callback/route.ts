import { NextResponse } from 'next/server';
import { sesion } from '@/lib/bodega/datos';
import { completarConexion } from '@/lib/bodega/dropi-mcp';

/** Regreso desde Dropi después de aprobar la conexión. */
export async function GET(req: Request) {
  if (!(await sesion())) return new Response('Entra primero al panel y vuelve a «Conectar Dropi».', { status: 401 });
  const u = new URL(req.url);
  try {
    await completarConexion(u.searchParams.get('code') ?? '', u.searchParams.get('state') ?? '');
  } catch (e) {
    return new Response(e instanceof Error ? e.message : 'No se pudo conectar Dropi.', { status: 400 });
  }
  return NextResponse.redirect(new URL('/bodega', u.origin));
}
