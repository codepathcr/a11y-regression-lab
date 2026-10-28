import { Button } from '@a11y-lab/ui';
import { useProfile } from '../store/profile-context';

/**
 * Barra de guardado.
 *
 * El botón se deshabilita cuando no hay cambios pendientes, y el estado
 * pendiente se comunica también como texto: deshabilitar un control sin
 * explicar por qué deja a la persona sin saber qué le falta hacer.
 */
export function SaveBar() {
  const { dirty, save } = useProfile();

  return (
    <div className="perfil__guardar">
      <p>{dirty ? 'Tenés cambios sin guardar.' : 'Todo está guardado.'}</p>
      <Button variant="primary" disabled={!dirty} onClick={save} data-testid="guardar">
        Guardar cambios
      </Button>
    </div>
  );
}
