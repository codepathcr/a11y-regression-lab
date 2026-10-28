import App from '../App';
import { baseParts } from '../parts';
import { TeamProvider } from '../store/TeamProvider';
import { TeamTableNoFocus } from '../mutations/TeamTableNoFocus';

/** Sustituye unicamente TeamTable. Ver la cabecera del modulo mutado. */
export default function Variant() {
  return (
    <TeamProvider>
      <App parts={{ ...baseParts, TeamTable: TeamTableNoFocus }} />
    </TeamProvider>
  );
}
