import { useWizard } from '../store/wizard-context';

/**
 * MUTACIÓN · eliminación del anuncio accesible de un mensaje de estado ·
 * operador propio · criterio 4.1.3
 *
 * El contenedor pierde `role="status"` y `aria-live`. En esta app se pierden dos
 * clases de información a la vez: **en qué paso está** la persona y **qué error
 * de validación** la detuvo.
 *
 * Es el caso más severo de este operador en todo el benchmark. En un formulario
 * multipaso, quien no ve la pantalla queda sin saber si avanzó, si retrocedió o
 * por qué no pasa nada al pulsar Continuar.
 */
export function AnnouncerSilent() {
  const { announcement } = useWizard();
  return <div className="a11y-live">{announcement}</div>;
}
