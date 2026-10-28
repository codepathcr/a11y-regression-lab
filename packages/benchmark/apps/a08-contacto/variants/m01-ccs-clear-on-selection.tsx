import App from '../App';
import { baseParts } from '../parts';
import { SupportProvider } from '../store/SupportProvider';
import { ReasonPickerClearsDetail } from '../mutations/ReasonPickerClearsDetail';

export default function Variant() {
  return (
    <SupportProvider>
      <App parts={{ ...baseParts, ReasonPicker: ReasonPickerClearsDetail }} />
    </SupportProvider>
  );
}
