import App from '../App';
import { baseParts } from '../parts';
import { TeamProvider } from '../store/TeamProvider';
import { TeamToolbarRefactored } from '../mutations/TeamToolbarRefactored';

/** Control negativo. Ver la cabecera del modulo refactorizado. */
export default function Variant() {
  return (
    <TeamProvider>
      <App parts={{ ...baseParts, TeamToolbar: TeamToolbarRefactored }} />
    </TeamProvider>
  );
}
