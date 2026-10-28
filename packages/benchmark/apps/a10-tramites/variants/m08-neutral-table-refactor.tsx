import App from '../App';
import { baseParts } from '../parts';
import { PortalProvider } from '../store/PortalProvider';
import { MyTramitesRefactored } from '../mutations/MyTramitesRefactored';

/** Control negativo. */
export default function Variant() {
  return (
    <PortalProvider>
      <App parts={{ ...baseParts, MyTramites: MyTramitesRefactored }} />
    </PortalProvider>
  );
}
