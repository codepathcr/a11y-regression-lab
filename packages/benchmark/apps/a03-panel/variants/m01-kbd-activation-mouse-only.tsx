import App from '../App';
import { baseParts } from '../parts';
import { PanelProvider } from '../store/PanelProvider';
import { DataTableMouseOnly } from '../mutations/DataTableMouseOnly';

/** Sustituye unicamente DataTable. Ver la cabecera del modulo mutado. */
export default function Variant() {
  return (
    <PanelProvider>
      <App parts={{ ...baseParts, DataTable: DataTableMouseOnly }} />
    </PanelProvider>
  );
}
