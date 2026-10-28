import App from '../App';
import { baseParts } from '../parts';
import { PortalProvider } from '../store/PortalProvider';
import { TramiteDetailRefactored } from '../mutations/TramiteDetailRefactored';

/** Control negativo. */
export default function Variant() {
  return (
    <PortalProvider>
      <App parts={{ ...baseParts, TramiteDetail: TramiteDetailRefactored }} />
    </PortalProvider>
  );
}
