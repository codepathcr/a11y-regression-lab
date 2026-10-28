import App from '../App';
import { baseParts } from '../parts';
import { PortalProvider } from '../store/PortalProvider';
import { PortalHeaderTabOrder } from '../mutations/PortalHeaderTabOrder';
import { MyTramitesWithSummary } from '../mutations/MyTramitesWithSummary';

/**
 * Lado derecho de un par con DEFECTO PREEXISTENTE.
 *
 * Se compara contra `m02-cto-nav-tab-order`, que ya tiene el defecto de
 * accesibilidad. Esta variante conserva ese mismo defecto y agrega un cambio
 * benigno, de modo que el delta entre los dos lados del par es exactamente una
 * parte: la benigna.
 *
 * Es la unica clase que cambia dos partes respecto de `base`, y el motivo es que
 * su lado izquierdo no es `base`. El invariante de la arquitectura se cumple en
 * su formulacion correcta: lo que debe ser exactamente una parte es el delta
 * entre los dos lados del par.
 */
export default function Variant() {
  return (
    <PortalProvider>
      <App parts={{ ...baseParts, PortalHeader: PortalHeaderTabOrder, MyTramites: MyTramitesWithSummary }} />
    </PortalProvider>
  );
}
