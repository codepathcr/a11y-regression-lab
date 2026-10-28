import { LiveRegion } from '@a11y-lab/ui';
import { useStore } from '../store/store-context';

/** Región live de la app, como parte intercambiable. */
export function Announcer() {
  const { announcement } = useStore();
  return <LiveRegion message={announcement} />;
}
