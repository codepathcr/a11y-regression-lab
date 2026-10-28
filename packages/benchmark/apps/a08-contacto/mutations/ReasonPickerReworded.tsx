import { Combobox } from '@a11y-lab/ui';
import { REASONS, useSupport } from '../store/support-context';

/**
 * DIVERGENCIA BENIGNA · reescritura del rótulo de un control
 *
 * El rótulo del combo pasa de un sustantivo a una pregunta. Es el mismo texto
 * visible y el mismo nombre accesible, porque el rótulo cumple las dos funciones,
 * y no cambia nada más: ni el orden de tabulación, ni el comportamiento al
 * elegir, ni el campo que se agrega.
 *
 * Es el contraste directo del positivo m01 de esta misma app, que también actúa
 * sobre `ReasonPicker` y también diverge en el paso de la selección. Uno borra
 * lo que la persona escribió y el otro solo cambia un rótulo: el par obliga a
 * mirar QUÉ cambió y no DÓNDE.
 */
export function ReasonPickerReworded() {
  const { setReason } = useSupport();

  return (
    <Combobox
      label="¿Sobre qué querés escribirnos?"
      options={REASONS.map((entry) => ({ id: entry.id, label: entry.label }))}
      onSelect={(option) => setReason(option.id)}
    />
  );
}
