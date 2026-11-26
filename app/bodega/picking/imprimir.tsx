'use client';

import { Printer } from 'lucide-react';

export const BotonImprimir = () => <button type="button" className="boton claro no-imprimir" onClick={() => window.print()}><Printer size={15} aria-hidden="true" /> Imprimir hoja</button>;
