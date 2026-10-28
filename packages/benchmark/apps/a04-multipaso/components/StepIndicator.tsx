import { STEPS, useWizard } from '../store/wizard-context';

/**
 * Indicador de progreso.
 *
 * Es una lista ordenada con `aria-current="step"` en el paso activo, no una
 * fila de colores: el estado de avance tiene que estar en el marcado y no solo
 * en el aspecto.
 */
export function StepIndicator() {
  const { step } = useWizard();

  return (
    <nav aria-label="Progreso del formulario">
      <ol className="paso__indicador">
        {STEPS.map((entry, index) => (
          <li key={entry.id} aria-current={index === step ? 'step' : undefined}>
            <span className="paso__numero">{index + 1}</span> {entry.label}
          </li>
        ))}
      </ol>
    </nav>
  );
}
