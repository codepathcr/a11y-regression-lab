import App from '../App';
import { baseParts } from '../parts';
import { WizardProvider } from '../store/WizardProvider';
import { StepFieldsAdvanceOnBlur } from '../mutations/StepFieldsAdvanceOnBlur';

/** Sustituye unicamente StepFields. Ver la cabecera del modulo mutado. */
export default function Variant() {
  return (
    <WizardProvider>
      <App parts={{ ...baseParts, StepFields: StepFieldsAdvanceOnBlur }} />
    </WizardProvider>
  );
}
