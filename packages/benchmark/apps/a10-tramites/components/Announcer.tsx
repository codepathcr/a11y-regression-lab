import { LiveRegion } from '@a11y-lab/ui';
import { usePortal } from '../store/portal-context';

/** Región live de la app, como parte intercambiable. */
export function Announcer() {
  const { announcement } = usePortal();
  return <LiveRegion message={announcement} />;
}
