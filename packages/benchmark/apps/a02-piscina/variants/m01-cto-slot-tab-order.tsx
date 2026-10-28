import App from '../App';
import { baseParts } from '../parts';
import { ReservationProvider } from '../store/ReservationProvider';
import { SlotGridTabOrder } from '../mutations/SlotGridTabOrder';

/** Sustituye únicamente SlotGrid. Ver la cabecera del módulo mutado. */
export default function Variant() {
  return (
    <ReservationProvider>
      <App parts={{ ...baseParts, SlotGrid: SlotGridTabOrder }} />
    </ReservationProvider>
  );
}
