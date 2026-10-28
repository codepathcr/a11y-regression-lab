import App from '../App';
import { baseParts } from '../parts';
import { SupportProvider } from '../store/SupportProvider';
import { SupportFormRefactored } from '../mutations/SupportFormRefactored';

export default function Variant() {
  return (
    <SupportProvider>
      <App parts={{ ...baseParts, SupportForm: SupportFormRefactored }} />
    </SupportProvider>
  );
}
