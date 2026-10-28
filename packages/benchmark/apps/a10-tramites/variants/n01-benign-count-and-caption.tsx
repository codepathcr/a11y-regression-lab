import App from '../App';
import { baseParts } from '../parts';
import { PortalProvider } from '../store/PortalProvider';
import { MyTramitesWithSummary } from '../mutations/MyTramitesWithSummary';

export default function Variant() {
  return (
    <PortalProvider>
      <App parts={{ ...baseParts, MyTramites: MyTramitesWithSummary }} />
    </PortalProvider>
  );
}
