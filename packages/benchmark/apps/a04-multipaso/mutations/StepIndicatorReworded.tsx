import { STEPS, useWizard } from '../store/wizard-context';

/**
 * DIVERGENCIA BENIGNA · reescritura del texto del indicador de progreso
 *
 * El número suelto pasa a una fórmula explícita, "Etapa 2 de 4". `aria-current`
 * se conserva en el paso activo, que es lo que comunica el avance de forma
 * programática.
 *
 * El texto cambia en TODOS los pasos de la traza y además cambia en cada
 * transición, porque el indicador refleja el paso activo. Es el caso benigno con
 * más líneas divergentes del estrato mediano, y sirve para comprobar que la
 * cantidad de divergencia no arrastra al modelo hacia afirmar una regresión.
 */
export function StepIndicatorReworded() {
  const { step } = useWizard();

  return (
    <nav aria-label="Progreso del formulario">
      <ol className="paso__indicador">
        {STEPS.map((entry, index) => (
          <li key={entry.id} aria-current={index === step ? 'step' : undefined}>
            <span className="paso__numero">
              Etapa {index + 1} de {STEPS.length}
            </span>{' '}
            {entry.label}
          </li>
        ))}
      </ol>
    </nav>
  );
}
