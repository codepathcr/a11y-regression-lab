import { LiveRegion } from '@a11y-lab/ui';
import { useProfile } from '../store/profile-context';

/** Región live de la app, como parte intercambiable. */
export function Announcer() {
  const { announcement } = useProfile();
  return <LiveRegion message={announcement} />;
}
