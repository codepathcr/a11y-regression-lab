import App from '../App';
import { baseParts } from '../parts';
import { TeamProvider } from '../store/TeamProvider';
import { TeamTableKeyboardSwallow } from '../mutations/TeamTableKeyboardSwallow';

/** Sustituye unicamente TeamTable. Ver la cabecera del modulo mutado. */
export default function Variant() {
  return (
    <TeamProvider>
      <App parts={{ ...baseParts, TeamTable: TeamTableKeyboardSwallow }} />
    </TeamProvider>
  );
}
