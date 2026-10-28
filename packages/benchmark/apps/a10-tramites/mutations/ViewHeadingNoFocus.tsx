import { usePortal } from '../store/portal-context';

const TITLES = {
  lista: 'Trámites disponibles',
  detalle: 'Detalle del trámite',
  solicitud: 'Presentar la solicitud',
  mis: 'Mis trámites',
} as const;

/**
 * MUTACIÓN · pérdida de foco después de una actualización dinámica · operador
 * propio · criterio 2.4.3
 *
 * Se elimina el efecto que mueve el foco al encabezado de la vista nueva. El
 * contenido se reemplaza por completo y el foco se queda en el control que
 * provocó el cambio.
 *
 * En esta app el escenario cruza **cuatro vistas**, de modo que el defecto se
 * manifiesta cuatro veces y la divergencia se acumula. Es el anfitrión donde
 * este operador produce más señal, y sirve de contraste con `a06-equipo`, donde
 * el mismo operador aplicado a una sola fila produce menos del 4%.
 *
 * Séptimo anfitrión del operador.
 */
export function ViewHeadingNoFocus() {
  const { view } = usePortal();
  return <h1 tabIndex={-1}>{TITLES[view]}</h1>;
}
