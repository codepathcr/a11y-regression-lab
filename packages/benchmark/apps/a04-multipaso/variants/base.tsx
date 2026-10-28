import App from '../App';
import { baseParts } from '../parts';
import { WizardProvider } from '../store/WizardProvider';

export default function Variant() {
  return (
    <WizardProvider>
      <App parts={baseParts} />
    </WizardProvider>
  );
}
