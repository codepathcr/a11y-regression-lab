import { LiveRegion } from '@a11y-lab/ui';
import { useBlog } from '../store/blog-context';

/** Región live de la app, como parte intercambiable. Anuncia el cambio de
 *  página; el recuento de la búsqueda lo anuncia `SearchBar` por su cuenta. */
export function Announcer() {
  const { announcement } = useBlog();
  return <LiveRegion message={announcement} />;
}
