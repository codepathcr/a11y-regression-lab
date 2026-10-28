import { useEffect, useRef } from 'react';
import { usePortal } from '../store/portal-context';

const TITLES = {
  lista: 'Trámites disponibles',
  detalle: 'Detalle del trámite',
  solicitud: 'Presentar la solicitud',
  mis: 'Mis trámites',
} as const;

/**
 * Encabezado de la vista activa, con el movimiento de foco al cambiar de vista.
 *
 * Vive en una parte intercambiable y no en la composición, para que un operador
 * pueda mutarlo: es la regla que dejó la fase 5. Segundo anfitrión del operador
 * de pérdida de foco junto con a09-tienda y a02-piscina.
 */
export function ViewHeading() {
  const { view } = usePortal();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [view]);

  return (
    <h1 ref={headingRef} tabIndex={-1}>
      {TITLES[view]}
    </h1>
  );
}
