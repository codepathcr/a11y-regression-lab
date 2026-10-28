import { LiveRegion } from '@a11y-lab/ui';
import { usePanel } from '../store/panel-context';

/**
 * Región live de la app.
 *
 * Vive en una parte intercambiable y no en la composición para que un operador
 * pueda mutarla: es la regla que dejó la fase 5, y sin ella el operador de
 * eliminación del anuncio accesible no tendría anfitrión en esta app.
 */
export function Announcer() {
  const { announcement } = usePanel();
  return <LiveRegion message={announcement} />;
}
