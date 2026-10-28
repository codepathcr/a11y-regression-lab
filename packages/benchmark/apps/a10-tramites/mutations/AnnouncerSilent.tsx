import { usePortal } from '../store/portal-context';

/**
 * MUTACIÓN · eliminación del anuncio accesible de un mensaje de estado ·
 * operador propio · criterio 4.1.3
 *
 * El contenedor pierde `role="status"` y `aria-live`. Se pierden el recuento de
 * resultados de cada consulta y, sobre todo, **el número de referencia del
 * trámite presentado**.
 *
 * Ese último es el peor caso de este operador en todo el benchmark: el número
 * de referencia es el comprobante de que la gestión se presentó, y es la única
 * forma de reclamar después. Un trámite que se presenta sin devolver un
 * comprobante legible es inservible para quien no ve la pantalla.
 *
 * Sexto anfitrión del operador.
 */
export function AnnouncerSilent() {
  const { announcement } = usePortal();
  return <div className="a11y-live">{announcement}</div>;
}
