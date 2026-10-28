import { Button } from '@a11y-lab/ui';
import { STEPS, useWizard } from '../store/wizard-context';

/**
 * CONTROL NEGATIVO · no introduce ninguna regresión de accesibilidad
 *
 * Segundo control de esta app y de otro tipo que el primero: **no toca el DOM**.
 * La etiqueta del botón de avance pasa de un condicional en línea a una función
 * auxiliar, y el estado deshabilitado de "Atrás" a un cálculo con nombre.
 *
 * El marcado resultante es idéntico carácter por carácter. Sirve para verificar
 * que la divergencia que producen los otros controles negativos viene de
 * reestructurar el DOM y no de refactorizar en general: si este caso diera
 * diferencias, el problema estaría en la captura y no en la normalización.
 */
function nextLabel(step: number): string {
  return step === STEPS.length - 1 ? 'Enviar propuesta' : 'Continuar';
}

function isFirstStep(step: number): boolean {
  return step === 0;
}

export function StepNavRefactored() {
  const { step, next, back, submitted } = useWizard();

  if (submitted) return null;

  return (
    <div className="paso__acciones">
      <Button disabled={isFirstStep(step)} onClick={back} data-testid="atras">
        Atrás
      </Button>
      <Button variant="primary" onClick={next} data-testid="continuar">
        {nextLabel(step)}
      </Button>
    </div>
  );
}
