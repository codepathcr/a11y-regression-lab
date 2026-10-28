import App from '../App';
import { baseParts } from '../parts';
import { PanelProvider } from '../store/PanelProvider';

export default function Variant() {
  return (
    <PanelProvider>
      <App parts={baseParts} />
    </PanelProvider>
  );
}
