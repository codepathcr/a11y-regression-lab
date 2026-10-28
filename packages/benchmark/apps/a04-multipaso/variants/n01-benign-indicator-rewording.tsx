import App from '../App';
import { baseParts } from '../parts';
import { WizardProvider } from '../store/WizardProvider';
import { StepIndicatorReworded } from '../mutations/StepIndicatorReworded';

export default function Variant() {
  return (
    <WizardProvider>
      <App parts={{ ...baseParts, StepIndicator: StepIndicatorReworded }} />
    </WizardProvider>
  );
}
