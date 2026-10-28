import App from '../App';
import { baseParts } from '../parts';
import { PortalProvider } from '../store/PortalProvider';
import { ViewHeadingNoFocus } from '../mutations/ViewHeadingNoFocus';

/** Sustituye unicamente ViewHeading. */
export default function Variant() {
  return (
    <PortalProvider>
      <App parts={{ ...baseParts, ViewHeading: ViewHeadingNoFocus }} />
    </PortalProvider>
  );
}
