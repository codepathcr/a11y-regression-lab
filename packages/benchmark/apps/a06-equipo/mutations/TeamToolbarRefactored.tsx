import { Button } from '@a11y-lab/ui';
import { useTeam } from '../store/team-context';

/**
 * CONTROL NEGATIVO · no introduce ninguna regresión de accesibilidad
 *
 * Segundo control de esta app y de otro tipo que el primero: **no toca el DOM**.
 * El recuento pasa a calcularse en una función con nombre y la apertura del
 * diálogo a un manejador extraído.
 *
 * El marcado resultante es idéntico. Verifica que la divergencia de los
 * controles negativos estructurales viene de reestructurar el DOM y no de
 * refactorizar en general.
 */
function describeCount(count: number): string {
  return `${count} integrantes`;
}

export function TeamToolbarRefactored() {
  const { members, setInviteOpen } = useTeam();
  const openInvite = (): void => setInviteOpen(true);

  return (
    <div className="equipo__barra">
      <p>{describeCount(members.length)}</p>
      <Button variant="primary" onClick={openInvite} data-testid="abrir-invitar">
        Invitar
      </Button>
    </div>
  );
}
