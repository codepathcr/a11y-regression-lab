import App from '../App';
import { baseParts } from '../parts';
import { PortalProvider } from '../store/PortalProvider';

export default function Variant() {
  return (
    <PortalProvider>
      <App parts={baseParts} />
    </PortalProvider>
  );
}
