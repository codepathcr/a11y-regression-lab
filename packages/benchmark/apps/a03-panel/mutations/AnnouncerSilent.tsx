import { usePanel } from '../store/panel-context';

/**
 * MUTACIÓN · eliminación del anuncio accesible de un mensaje de estado ·
 * operador propio · criterio 4.1.3
 *
 * El contenedor del mensaje pierde `role="status"` y `aria-live` y pasa a ser un
 * `<div>` sin semántica. El texto sigue apareciendo en pantalla exactamente
 * igual.
 *
 * En esta app el efecto es severo porque **todo** lo que la app comunica pasa
 * por aquí: el nuevo orden de la tabla y el recuento del filtro. Quien no ve la
 * pantalla deja de enterarse de que la tabla se reordenó o de cuántas
 * incidencias quedaron tras filtrar, que es justo la información por la que
 * usaría esos controles.
 *
 * Segundo anfitrión del operador, junto con el formulario de a01-landing, y con
 * una diferencia que lo hace valioso: allí se pierde un anuncio, aquí se pierden
 * cinco a lo largo del escenario.
 */
export function AnnouncerSilent() {
  const { announcement } = usePanel();
  return <div className="a11y-live">{announcement}</div>;
}
