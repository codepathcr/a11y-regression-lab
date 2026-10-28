import App from '../App';
import { baseParts } from '../parts';
import { TeamProvider } from '../store/TeamProvider';
import { TeamTableRefactored } from '../mutations/TeamTableRefactored';

/** Control negativo. Ver la cabecera del modulo refactorizado. */
export default function Variant() {
  return (
    <TeamProvider>
      <App parts={{ ...baseParts, TeamTable: TeamTableRefactored }} />
    </TeamProvider>
  );
}
