import App from '../App';
import { baseParts } from '../parts';
import { PortalProvider } from '../store/PortalProvider';
import { AnnouncerSilent } from '../mutations/AnnouncerSilent';

/** Sustituye unicamente Announcer. */
export default function Variant() {
  return (
    <PortalProvider>
      <App parts={{ ...baseParts, Announcer: AnnouncerSilent }} />
    </PortalProvider>
  );
}
