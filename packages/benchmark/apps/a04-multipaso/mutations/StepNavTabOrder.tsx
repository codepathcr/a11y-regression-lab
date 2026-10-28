import { Button } from '@a11y-lab/ui';
import { STEPS, useWizard } from '../store/wizard-context';

/**
 * MUTACIÓN · CTO, Change Tab Index Order · operador de Ma11y
 * (Tafreshipour et al., 2024) · criterio 2.4.3
 *
 * Se asigna `tabindex="-1"` al botón "Atrás", retirándolo del orden de
 * tabulación. Sigue visible y sigue funcionando con el ratón; quien navega por
 * teclado **no puede volver a un paso anterior** para corregir lo que escribió.
 *
 * Es el caso donde este operador duele más: en un formulario por pasos, no
 * poder retroceder obliga a enviar con errores o a abandonar.
 *
 * Tercer anfitrión del operador, junto con a02-piscina y a03-panel.
 */
export function StepNavTabOrder() {
  const { step, next, back, submitted } = useWizard();

  if (submitted) return null;

  return (
    <div className="paso__acciones">
      <Button disabled={step === 0} tabIndex={-1} onClick={back} data-testid="atras">
        Atrás
      </Button>
      <Button variant="primary" onClick={next} data-testid="continuar">
        {step === STEPS.length - 1 ? 'Enviar propuesta' : 'Continuar'}
      </Button>
    </div>
  );
}
