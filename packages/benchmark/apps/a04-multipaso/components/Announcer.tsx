import { LiveRegion } from '@a11y-lab/ui';
import { useWizard } from '../store/wizard-context';

/** Región live de la app, como parte intercambiable para que un operador pueda
 *  mutarla. Ver la regla que dejó la fase 5 en docs/protocolo-mutacion.md. */
export function Announcer() {
  const { announcement } = useWizard();
  return <LiveRegion message={announcement} />;
}
