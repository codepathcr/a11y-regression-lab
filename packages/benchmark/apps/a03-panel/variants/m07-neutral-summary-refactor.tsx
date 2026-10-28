import App from '../App';
import { baseParts } from '../parts';
import { PanelProvider } from '../store/PanelProvider';
import { PanelSummaryRefactored } from '../mutations/PanelSummaryRefactored';

/** Control negativo. Ver la cabecera del modulo refactorizado. */
export default function Variant() {
  return (
    <PanelProvider>
      <App parts={{ ...baseParts, PanelSummary: PanelSummaryRefactored }} />
    </PanelProvider>
  );
}
