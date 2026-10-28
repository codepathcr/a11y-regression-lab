import App from '../App';
import { baseParts } from '../parts';
import { ReservationProvider } from '../store/ReservationProvider';
import { PoolRulesReworded } from '../mutations/PoolRulesReworded';

export default function Variant() {
  return (
    <ReservationProvider>
      <App parts={{ ...baseParts, PoolRules: PoolRulesReworded }} />
    </ReservationProvider>
  );
}
