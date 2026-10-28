import App from '../App';
import { baseParts } from '../parts';
import { SupportProvider } from '../store/SupportProvider';
import { ReasonPickerReworded } from '../mutations/ReasonPickerReworded';

export default function Variant() {
  return (
    <SupportProvider>
      <App parts={{ ...baseParts, ReasonPicker: ReasonPickerReworded }} />
    </SupportProvider>
  );
}
