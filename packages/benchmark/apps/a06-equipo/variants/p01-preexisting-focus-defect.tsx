import App from '../App';
import { baseParts } from '../parts';
import { TeamProvider } from '../store/TeamProvider';
import { TeamTableNoFocus } from '../mutations/TeamTableNoFocus';
import { TeamToolbarBetterLabel } from '../mutations/TeamToolbarBetterLabel';

/**
 * Lado derecho de un par con DEFECTO PREEXISTENTE.
 *
 * Se compara contra `m01-focus-loss-row-removal`, que ya tiene el defecto de
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
    <TeamProvider>
      <App parts={{ ...baseParts, TeamTable: TeamTableNoFocus, TeamToolbar: TeamToolbarBetterLabel }} />
    </TeamProvider>
  );
}
