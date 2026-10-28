import { Combobox } from '@a11y-lab/ui';
import { REASONS, useSupport } from '../store/support-context';

/**
 * Selección del motivo del contacto.
 *
 * Tercer anfitrión de la primitiva `Combobox`, junto con a03-panel y
 * a09-tienda.
 *
 * Elegir un motivo **agrega un campo** al formulario, y eso se anuncia desde la
 * región live de la app. Es un cambio de contenido provocado por un control, de
 * los que el criterio 3.2.2 permite siempre que no desoriente: aquí es un campo
 * más debajo del actual, anunciado, y sin mover el foco. Hecho mal, el mismo
 * cambio es una regresión.
 */
export function ReasonPicker() {
  const { setReason } = useSupport();

  return (
    <Combobox
      label="Motivo del contacto"
      options={REASONS.map((entry) => ({ id: entry.id, label: entry.label }))}
      onSelect={(option) => setReason(option.id)}
    />
  );
}
