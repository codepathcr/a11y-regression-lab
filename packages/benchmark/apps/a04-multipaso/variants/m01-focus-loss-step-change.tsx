import App from '../App';
import { baseParts } from '../parts';
import { WizardProvider } from '../store/WizardProvider';
import { StepFieldsNoFocus } from '../mutations/StepFieldsNoFocus';

/** Sustituye unicamente StepFields. Ver la cabecera del modulo mutado. */
export default function Variant() {
  return (
    <WizardProvider>
      <App parts={{ ...baseParts, StepFields: StepFieldsNoFocus }} />
    </WizardProvider>
  );
}
