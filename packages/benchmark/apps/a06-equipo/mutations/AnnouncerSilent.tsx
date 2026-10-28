import { useTeam } from '../store/team-context';

/**
 * MUTACIÓN · eliminación del anuncio accesible de un mensaje de estado ·
 * operador propio · criterio 4.1.3
 *
 * El contenedor pierde `role="status"` y `aria-live`. En esta app se pierden
 * tres anuncios distintos: el cambio de rol de una persona, su retiro del
 * equipo y el envío de una invitación.
 *
 * Los tres son operaciones **destructivas o con consecuencias**, y es lo que
 * hace grave este caso: quien no ve la pantalla ejecuta un cambio de permisos o
 * retira a alguien del equipo sin ninguna confirmación de que ocurrió.
 *
 * Quinto anfitrión del operador.
 */
export function AnnouncerSilent() {
  const { announcement } = useTeam();
  return <div className="a11y-live">{announcement}</div>;
}
