import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus_Jakarta_Sans, DM_Mono } from 'next/font/google';
import { MARCA } from '@/lib/bodega/marca';
import { sesion } from '@/lib/bodega/datos';
import { estadoDropi } from '@/lib/bodega/dropi-mcp';
import { MenuBodega } from './menu';
import { conectarDropi } from './acciones';
import './bodega.css';

const sans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--bd-sans' });
const mono = DM_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--bd-mono' });

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: `Bodega · ${MARCA.nombre}`, robots: { index: false, follow: false } };

/** Panel de la bodega: para el equipo que alista y despacha. */
export default async function LayoutBodega({ children }: { children: React.ReactNode }) {
  const clases = `bdg ${sans.variable} ${mono.variable}`;
  if (!(await sesion())) {
    return (
      <div className={clases}>
        <main className="entrada">
          <div className="tarjeta">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={MARCA.logo} alt={MARCA.nombre} />
            <p className="rotulo">Bodega · Despachos</p>
            <p className="texto" style={{ margin: '24px 0' }}>Entra primero con tu cuenta del panel y vuelve a esta página.</p>
            <a className="boton" href={MARCA.panel}>Entrar al panel</a>
          </div>
        </main>
      </div>
    );
  }
  const dropi = await estadoDropi().catch(() => ({ conectada: null }));
  return (
    <div className={clases}>
      <div className="shell">
        <aside className="lateral">
          <Link href="/bodega" className="marca">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={MARCA.logo} alt={MARCA.nombre} />
            <span>Bodega · Despachos</span>
          </Link>
          <MenuBodega />
          <div className="lateral-pie">
            {dropi.conectada !== null
              ? <div className="dato">Dropi conectado</div>
              : <form action={conectarDropi}><button className="salir" type="submit">Conectar Dropi</button></form>}
            <a className="dato" href={MARCA.panel}>Volver al panel</a>
          </div>
        </aside>
        <main className="principal">
          <div className="barra-movil">
            <div className="arriba">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={MARCA.logo} alt={MARCA.nombre} />
              <a className="salir" href={MARCA.panel}>Panel</a>
            </div>
            <MenuBodega movil />
          </div>
          <div className="contenido">{children}</div>
        </main>
      </div>
    </div>
  );
}
