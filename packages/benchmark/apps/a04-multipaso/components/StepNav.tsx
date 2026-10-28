import { Button } from '@a11y-lab/ui';
import { STEPS, useWizard } from '../store/wizard-context';

/** Botones de avance y retroceso. */
export function StepNav() {
  const { step, next, back, submitted } = useWizard();

  if (submitted) return null;

  return (
    <div className="paso__acciones">
      <Button disabled={step === 0} onClick={back} data-testid="atras">
        Atrás
      </Button>
      <Button variant="primary" onClick={next} data-testid="continuar">
        {step === STEPS.length - 1 ? 'Enviar propuesta' : 'Continuar'}
      </Button>
    </div>
  );
}
