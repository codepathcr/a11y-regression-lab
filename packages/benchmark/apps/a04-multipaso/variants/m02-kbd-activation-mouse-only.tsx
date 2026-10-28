import App from '../App';
import { baseParts } from '../parts';
import { WizardProvider } from '../store/WizardProvider';
import { StepNavMouseOnly } from '../mutations/StepNavMouseOnly';

/** Sustituye unicamente StepNav. Ver la cabecera del modulo mutado. */
export default function Variant() {
  return (
    <WizardProvider>
      <App parts={{ ...baseParts, StepNav: StepNavMouseOnly }} />
    </WizardProvider>
  );
}
