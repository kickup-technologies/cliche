'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Boxes, ClipboardList } from 'lucide-react';

const ENLACES = [
  { href: '/bodega', etiqueta: 'Despachos', icono: Boxes },
  { href: '/bodega/picking', etiqueta: 'Picking', icono: ClipboardList },
];
const activo = (ruta: string, href: string) => (href === '/bodega' ? ruta === '/bodega' : ruta.startsWith(href));

/** Menú de la bodega: barra lateral en escritorio y píldoras arriba en celular. */
export function MenuBodega({ movil }: { movil?: boolean }) {
  const ruta = usePathname();
  if (movil) {
    return <nav aria-label="Bodega">{ENLACES.map(e => <Link key={e.href} href={e.href} className={activo(ruta, e.href) ? 'activo' : ''}>{e.etiqueta}</Link>)}</nav>;
  }
  return (
    <nav className="nav" aria-label="Bodega">
      {ENLACES.map(({ href, etiqueta, icono: Icono }) => (
        <Link key={href} href={href} className={activo(ruta, href) ? 'activo' : ''} aria-current={activo(ruta, href) ? 'page' : undefined}>
          <Icono size={16} strokeWidth={1.6} /> {etiqueta}
        </Link>
      ))}
    </nav>
  );
}
