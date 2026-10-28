import App from '../App';
import { baseParts } from '../parts';
import { WizardProvider } from '../store/WizardProvider';
import { StepIndicatorRefactored } from '../mutations/StepIndicatorRefactored';

/** Control negativo. Ver la cabecera del modulo refactorizado. */
export default function Variant() {
  return (
    <WizardProvider>
      <App parts={{ ...baseParts, StepIndicator: StepIndicatorRefactored }} />
    </WizardProvider>
  );
}
