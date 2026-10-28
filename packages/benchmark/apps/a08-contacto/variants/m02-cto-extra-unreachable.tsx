import App from '../App';
import { baseParts } from '../parts';
import { SupportProvider } from '../store/SupportProvider';
import { SupportFormTabOrder } from '../mutations/SupportFormTabOrder';

export default function Variant() {
  return (
    <SupportProvider>
      <App parts={{ ...baseParts, SupportForm: SupportFormTabOrder }} />
    </SupportProvider>
  );
}
