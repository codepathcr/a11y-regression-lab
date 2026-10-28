import App from '../App';
import { baseParts } from '../parts';
import { TeamProvider } from '../store/TeamProvider';
import { AnnouncerSilent } from '../mutations/AnnouncerSilent';

/** Sustituye unicamente Announcer. Ver la cabecera del modulo mutado. */
export default function Variant() {
  return (
    <TeamProvider>
      <App parts={{ ...baseParts, Announcer: AnnouncerSilent }} />
    </TeamProvider>
  );
}
