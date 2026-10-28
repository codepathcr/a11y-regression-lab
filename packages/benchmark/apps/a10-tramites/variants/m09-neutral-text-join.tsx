import App from '../App';
import { baseParts } from '../parts';
import { PortalProvider } from '../store/PortalProvider';
import { TramiteSearchTextJoin } from '../mutations/TramiteSearchTextJoin';

/** Control negativo, disenado para poner a prueba la union de nodos de texto. */
export default function Variant() {
  return (
    <PortalProvider>
      <App parts={{ ...baseParts, TramiteSearch: TramiteSearchTextJoin }} />
    </PortalProvider>
  );
}
