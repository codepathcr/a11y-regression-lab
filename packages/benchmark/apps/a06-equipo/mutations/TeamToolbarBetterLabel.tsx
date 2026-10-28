import { Button } from '@a11y-lab/ui';
import { useTeam } from '../store/team-context';

/**
 * DIVERGENCIA BENIGNA · mejora del nombre accesible
 *
 * El botón "Invitar" recibe un nombre accesible más descriptivo. Es una MEJORA
 * de accesibilidad, no una preservación: quien recorre los controles de la
 * página fuera de contexto pasa de oír "Invitar" a oír a qué invita.
 *
 * El nombre accesible contiene el texto visible, que es lo que exige el criterio
 * 2.5.3, Label in Name. Sin esa precaución el par dejaría de ser benigno y
 * `axe-core` lo marcaría, lo que convertiría el control en un positivo mal
 * declarado.
 *
 * Es el caso benigno más exigente de los diez: la respuesta correcta es "no hay
 * regresión" aunque el nombre accesible de un control haya cambiado, que es
 * precisamente la señal que un detector ingenuo usaría para afirmar lo
 * contrario.
 */
export function TeamToolbarBetterLabel() {
  const { members, setInviteOpen } = useTeam();

  return (
    <div className="equipo__barra">
      <p>{members.length} integrantes</p>
      <Button
        variant="primary"
        aria-label="Invitar a una persona al equipo"
        onClick={() => setInviteOpen(true)}
        data-testid="abrir-invitar"
      >
        Invitar
      </Button>
    </div>
  );
}
