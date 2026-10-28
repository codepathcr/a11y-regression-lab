import App from '../App';
import { baseParts } from '../parts';
import { StoreProvider } from '../store/StoreProvider';
import { ViewHeadingNoFocus } from '../mutations/ViewHeadingNoFocus';

/** Sustituye únicamente ViewHeading. Ver la cabecera del módulo mutado. */
export default function Variant() {
  return (
    <StoreProvider>
      <App parts={{ ...baseParts, ViewHeading: ViewHeadingNoFocus }} />
    </StoreProvider>
  );
}
