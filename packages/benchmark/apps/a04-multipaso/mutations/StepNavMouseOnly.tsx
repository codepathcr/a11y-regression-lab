import type { KeyboardEvent } from 'react';
import { Button } from '@a11y-lab/ui';
import { STEPS, useWizard } from '../store/wizard-context';


/** Se come Enter y Espacio: el navegador no sintetiza el clic de esas teclas. */
function swallowKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
  if (event.key === 'Enter' || event.key === ' ') event.preventDefault();
}

/**
 * MUTACIÓN · eliminación de activación mediante teclado · operador propio ·
 * criterio 2.1.1
 *
 * El botón de avance sigue siendo tabulable y sigue anunciándose como botón,
 * pero Enter y Espacio dejan de hacer nada. *
 * OPERACIONALIZACIÓN. Se conserva `onClick` y se agrega un manejador de
 * `keydown` que llama a `preventDefault()` para Enter y Espacio, con lo que el
 * navegador no sintetiza el clic que esas teclas producen. El botón sigue
 * recibiendo el foco y sigue anunciándose como botón; simplemente no responde
 * al teclado.
 *
 * Es el patrón real: alguien agrega un manejador de teclado para un atajo
 * propio y se come Enter sin notarlo.
 *
 * Una operacionalización anterior usaba `onMouseDown` en lugar de `onClick`, y
 * se descartó. Funcionaba, pero `mousedown` se dispara ANTES que `click`, de
 * modo que con el ratón el cambio de estado ocurría en otro punto de la
 * secuencia de eventos: el mutante divergía también en pasos donde el
 * comportamiento de accesibilidad era idéntico. Era una diferencia real pero
 * ajena al defecto, y habría contaminado la métrica de localización. Con
 * `preventDefault` sobre `keydown`, el camino del ratón queda idéntico y la
 * divergencia aparece únicamente donde el escenario usa el teclado.
 *
 * En un formulario multipaso el efecto es una trampa sin salida: la persona
 * completa los campos, pulsa Enter, y la página no responde ni explica por qué.
 * El botón "Atrás" sigue funcionando con el teclado, lo que vuelve el defecto
 * aún más desconcertante.
 *
 * Requiere que el escenario avance **por teclado** al menos una vez.
 */
export function StepNavMouseOnly() {
  const { step, next, back, submitted } = useWizard();

  if (submitted) return null;

  return (
    <div className="paso__acciones">
      <Button disabled={step === 0} onClick={back} data-testid="atras">
        Atrás
      </Button>
      <Button variant="primary" onKeyDown={swallowKeyboard} onClick={next} data-testid="continuar">
        {step === STEPS.length - 1 ? 'Enviar propuesta' : 'Continuar'}
      </Button>
    </div>
  );
}
