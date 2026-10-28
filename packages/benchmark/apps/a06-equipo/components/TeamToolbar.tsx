import { Button } from '@a11y-lab/ui';
import { useTeam } from '../store/team-context';

/** Barra con el recuento y la entrada a la invitación. */
export function TeamToolbar() {
  const { members, setInviteOpen } = useTeam();

  return (
    <div className="equipo__barra">
      <p>{members.length} integrantes</p>
      <Button variant="primary" onClick={() => setInviteOpen(true)} data-testid="abrir-invitar">
        Invitar
      </Button>
    </div>
  );
}
