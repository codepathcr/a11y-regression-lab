import App from '../App';
import { baseParts } from '../parts';
import { PanelProvider } from '../store/PanelProvider';
import { AnnouncerSilent } from '../mutations/AnnouncerSilent';

/** Sustituye unicamente Announcer. Ver la cabecera del modulo mutado. */
export default function Variant() {
  return (
    <PanelProvider>
      <App parts={{ ...baseParts, Announcer: AnnouncerSilent }} />
    </PanelProvider>
  );
}
