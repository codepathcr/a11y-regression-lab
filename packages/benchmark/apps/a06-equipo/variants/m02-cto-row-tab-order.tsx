import App from '../App';
import { baseParts } from '../parts';
import { TeamProvider } from '../store/TeamProvider';
import { TeamTableTabOrder } from '../mutations/TeamTableTabOrder';

/** Sustituye unicamente TeamTable. Ver la cabecera del modulo mutado. */
export default function Variant() {
  return (
    <TeamProvider>
      <App parts={{ ...baseParts, TeamTable: TeamTableTabOrder }} />
    </TeamProvider>
  );
}
