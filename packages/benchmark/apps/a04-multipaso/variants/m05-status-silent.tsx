import App from '../App';
import { baseParts } from '../parts';
import { WizardProvider } from '../store/WizardProvider';
import { AnnouncerSilent } from '../mutations/AnnouncerSilent';

/** Sustituye unicamente Announcer. Ver la cabecera del modulo mutado. */
export default function Variant() {
  return (
    <WizardProvider>
      <App parts={{ ...baseParts, Announcer: AnnouncerSilent }} />
    </WizardProvider>
  );
}
