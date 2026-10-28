import App from '../App';
import { baseParts } from '../parts';
import { PortalProvider } from '../store/PortalProvider';
import { TramiteFormConfirmOnBlur } from '../mutations/TramiteFormConfirmOnBlur';

/** Sustituye unicamente TramiteForm. */
export default function Variant() {
  return (
    <PortalProvider>
      <App parts={{ ...baseParts, TramiteForm: TramiteFormConfirmOnBlur }} />
    </PortalProvider>
  );
}
