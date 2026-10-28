import { Combobox } from '@a11y-lab/ui';
import { REASONS, useSupport } from '../store/support-context';

/**
 * MUTACIÓN · CCS, Change Context on Selection · operador de Ma11y
 * (Tafreshipour et al., 2024) · criterio 3.2.2
 *
 * El paper define el operador por nombre y categoría —Understandable /
 * Predictable, falla F37— pero no detalla la transformación. La
 * operacionalización es propia de este estudio.
 *
 * Transformación: elegir un motivo borra el texto que la persona ya había
 * escrito en el campo de detalle. La justificación de diseño sería que el
 * detalle depende del motivo, y el resultado es que la persona pierde su texto
 * sin aviso ni posibilidad de recuperarlo.
 *
 * Es un mecanismo distinto al CCS de a09-tienda, que cambia de vista completa:
 * este no mueve el foco ni reemplaza la pantalla, solo vacía un campo. Es el
 * caso más silencioso del operador en el benchmark, porque quien ve la pantalla
 * puede notar el campo vacío y quien no la ve no tiene ninguna señal.
 */
export function ReasonPickerClearsDetail() {
  const { setReason, setDetail } = useSupport();

  return (
    <Combobox
      label="Motivo del contacto"
      options={REASONS.map((entry) => ({ id: entry.id, label: entry.label }))}
      onSelect={(option) => {
        setReason(option.id);
        setDetail('');
      }}
    />
  );
}
