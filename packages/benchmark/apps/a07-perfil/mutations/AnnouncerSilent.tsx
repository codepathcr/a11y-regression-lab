import { useProfile } from '../store/profile-context';

/**
 * MUTACIÓN · eliminación del anuncio accesible de un mensaje de estado ·
 * operador propio · criterio 4.1.3
 *
 * El contenedor pierde `role="status"` y `aria-live`. Se pierde la confirmación
 * de guardado.
 *
 * El caso es más severo de lo que parece por la interacción con la barra de
 * guardado: al guardar, el botón se deshabilita y el texto pasa a "Todo está
 * guardado". Quien ve la pantalla tiene dos señales visuales redundantes; quien
 * no la ve pierde la única que tenía, y además el control que acababa de
 * accionar sale del orden de tabulación en el mismo instante.
 *
 * Noveno anfitrión del operador.
 */
export function AnnouncerSilent() {
  const { announcement } = useProfile();
  return <div className="a11y-live">{announcement}</div>;
}
