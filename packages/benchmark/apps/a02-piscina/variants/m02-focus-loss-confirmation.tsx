import App from '../App';
import { baseParts } from '../parts';
import { ReservationProvider } from '../store/ReservationProvider';
import { ReservationFormNoFocus } from '../mutations/ReservationFormNoFocus';

/** Sustituye únicamente ReservationForm. Ver la cabecera del módulo mutado. */
export default function Variant() {
  return (
    <ReservationProvider>
      <App parts={{ ...baseParts, ReservationForm: ReservationFormNoFocus }} />
    </ReservationProvider>
  );
}
