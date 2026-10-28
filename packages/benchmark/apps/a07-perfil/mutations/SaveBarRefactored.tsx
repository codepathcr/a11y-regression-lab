import { Button } from '@a11y-lab/ui';
import { useProfile } from '../store/profile-context';

/**
 * CONTROL NEGATIVO · reorganización del cálculo sin cambio en el DOM
 *
 * El texto de estado pasa de una expresión ternaria en línea a una función
 * auxiliar, y la condición de habilitado a una variable con nombre. El marcado
 * resultante es idéntico elemento por elemento y atributo por atributo.
 *
 * Cubre el caso de texto de una sola cadena que cambia de valor, que es el que
 * ejercita la regla de fusión de nodos de texto del normalizador en el estrato
 * pequeño.
 */
function describeState(dirty: boolean): string {
  return dirty ? 'Tenés cambios sin guardar.' : 'Todo está guardado.';
}

export function SaveBarRefactored() {
  const { dirty, save } = useProfile();
  const canSave = dirty;

  return (
    <div className="perfil__guardar">
      <p>{describeState(dirty)}</p>
      <Button variant="primary" disabled={!canSave} onClick={save} data-testid="guardar">
        Guardar cambios
      </Button>
    </div>
  );
}
