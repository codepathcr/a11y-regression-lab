import App from '../App';
import { baseParts } from '../parts';
import { PanelProvider } from '../store/PanelProvider';
import { DataTableRefactored } from '../mutations/DataTableRefactored';

/** Control negativo. Ver la cabecera del modulo refactorizado. */
export default function Variant() {
  return (
    <PanelProvider>
      <App parts={{ ...baseParts, DataTable: DataTableRefactored }} />
    </PanelProvider>
  );
}
