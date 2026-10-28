import App from '../App';
import { baseParts } from '../parts';
import { PortalProvider } from '../store/PortalProvider';
import { PortalHeaderTabOrder } from '../mutations/PortalHeaderTabOrder';

/** Sustituye unicamente PortalHeader. */
export default function Variant() {
  return (
    <PortalProvider>
      <App parts={{ ...baseParts, PortalHeader: PortalHeaderTabOrder }} />
    </PortalProvider>
  );
}
