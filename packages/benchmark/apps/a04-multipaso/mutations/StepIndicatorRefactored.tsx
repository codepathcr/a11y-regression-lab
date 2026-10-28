import { STEPS, useWizard } from '../store/wizard-context';

/**
 * CONTROL NEGATIVO · no introduce ninguna regresión de accesibilidad
 *
 * El elemento de cada paso se extrae a un componente propio y la lista se
 * envuelve en un contenedor de maquetación para permitir desplazamiento en
 * pantallas angostas.
 *
 * `aria-current="step"`, el orden de la lista y los nombres accesibles quedan
 * idénticos. El contenedor desplaza la ruta en el DOM de la lista entera.
 */
function StepItem({ index, label, active }: { index: number; label: string; active: boolean }) {
  return (
    <li aria-current={active ? 'step' : undefined}>
      <span className="paso__numero">{index + 1}</span> {label}
    </li>
  );
}

export function StepIndicatorRefactored() {
  const { step } = useWizard();

  return (
    <nav aria-label="Progreso del formulario">
      <div className="paso__indicador-envoltorio">
        <ol className="paso__indicador">
          {STEPS.map((entry, index) => (
            <StepItem key={entry.id} index={index} label={entry.label} active={index === step} />
          ))}
        </ol>
      </div>
    </nav>
  );
}
