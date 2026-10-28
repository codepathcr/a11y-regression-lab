import { LiveRegion } from '@a11y-lab/ui';
import { useTeam } from '../store/team-context';

/** Región live de la app, como parte intercambiable. */
export function Announcer() {
  const { announcement } = useTeam();
  return <LiveRegion message={announcement} />;
}
