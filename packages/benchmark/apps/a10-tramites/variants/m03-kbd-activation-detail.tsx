import App from '../App';
import { baseParts } from '../parts';
import { PortalProvider } from '../store/PortalProvider';
import { TramiteSearchKeyboardSwallow } from '../mutations/TramiteSearchKeyboardSwallow';

/** Sustituye unicamente TramiteSearch. */
export default function Variant() {
  return (
    <PortalProvider>
      <App parts={{ ...baseParts, TramiteSearch: TramiteSearchKeyboardSwallow }} />
    </PortalProvider>
  );
}
