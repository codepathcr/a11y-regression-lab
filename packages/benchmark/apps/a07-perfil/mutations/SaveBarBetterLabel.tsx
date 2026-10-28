import { Button } from '@a11y-lab/ui';
import { useProfile } from '../store/profile-context';

/**
 * DIVERGENCIA BENIGNA · mejora del nombre accesible y del texto de estado
 *
 * El botón de guardar recibe un nombre accesible que dice qué guarda, y el texto
 * de estado se reescribe. El nombre accesible contiene el texto visible, como
 * exige el criterio 2.5.3.
 *
 * El par es interesante porque el botón que cambia de nombre es el mismo que el
 * operador CCB de esta app deja deshabilitado y el mismo cuyo anuncio elimina el
 * operador de mensajes de estado. Tres pares de la misma app tocan el mismo
 * control y solo dos son regresiones.
 */
function describeState(dirty: boolean): string {
  return dirty ? 'Hay cambios sin guardar.' : 'No hay cambios pendientes.';
}

export function SaveBarBetterLabel() {
  const { dirty, save } = useProfile();

  return (
    <div className="perfil__guardar">
      <p>{describeState(dirty)}</p>
      <Button
        variant="primary"
        aria-label="Guardar cambios de la cuenta"
        disabled={!dirty}
        onClick={save}
        data-testid="guardar"
      >
        Guardar cambios
      </Button>
    </div>
  );
}
