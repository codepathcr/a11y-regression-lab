import App from '../App';
import { baseParts } from '../parts';
import { PortalProvider } from '../store/PortalProvider';
import { TramiteSearchNoBusy } from '../mutations/TramiteSearchNoBusy';

/** Sustituye unicamente TramiteSearch. */
export default function Variant() {
  return (
    <PortalProvider>
      <App parts={{ ...baseParts, TramiteSearch: TramiteSearchNoBusy }} />
    </PortalProvider>
  );
}
