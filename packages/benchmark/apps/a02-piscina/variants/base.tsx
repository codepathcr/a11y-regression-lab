import App from '../App';
import { baseParts } from '../parts';
import { ReservationProvider } from '../store/ReservationProvider';

export default function Variant() {
  return (
    <ReservationProvider>
      <App parts={baseParts} />
    </ReservationProvider>
  );
}
