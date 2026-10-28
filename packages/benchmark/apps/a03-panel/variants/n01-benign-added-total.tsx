import App from '../App';
import { baseParts } from '../parts';
import { PanelProvider } from '../store/PanelProvider';
import { PanelSummaryWithTotal } from '../mutations/PanelSummaryWithTotal';

export default function Variant() {
  return (
    <PanelProvider>
      <App parts={{ ...baseParts, PanelSummary: PanelSummaryWithTotal }} />
    </PanelProvider>
  );
}
