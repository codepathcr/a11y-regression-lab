import App from '../App';
import { baseParts } from '../parts';
import { PortalProvider } from '../store/PortalProvider';
import { TramiteDetailNavigateOnTab } from '../mutations/TramiteDetailNavigateOnTab';

/** Sustituye unicamente TramiteDetail. */
export default function Variant() {
  return (
    <PortalProvider>
      <App parts={{ ...baseParts, TramiteDetail: TramiteDetailNavigateOnTab }} />
    </PortalProvider>
  );
}
