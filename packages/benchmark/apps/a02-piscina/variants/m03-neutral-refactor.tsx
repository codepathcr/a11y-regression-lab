import App from '../App';
import { baseParts } from '../parts';
import { ReservationProvider } from '../store/ReservationProvider';
import { SlotGridRefactored } from '../mutations/SlotGridRefactored';

/** Control negativo. Ver la cabecera del módulo refactorizado. */
export default function Variant() {
  return (
    <ReservationProvider>
      <App parts={{ ...baseParts, SlotGrid: SlotGridRefactored }} />
    </ReservationProvider>
  );
}
