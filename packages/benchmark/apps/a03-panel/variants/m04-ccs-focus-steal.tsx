import App from '../App';
import { baseParts } from '../parts';
import { PanelProvider } from '../store/PanelProvider';
import { PanelFiltersFocusSteal } from '../mutations/PanelFiltersFocusSteal';

/** Sustituye unicamente PanelFilters. Ver la cabecera del modulo mutado. */
export default function Variant() {
  return (
    <PanelProvider>
      <App parts={{ ...baseParts, PanelFilters: PanelFiltersFocusSteal }} />
    </PanelProvider>
  );
}
