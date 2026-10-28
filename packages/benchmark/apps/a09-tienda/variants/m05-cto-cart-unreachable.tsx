import App from '../App';
import { baseParts } from '../parts';
import { StoreProvider } from '../store/StoreProvider';
import { StoreHeaderTabOrder } from '../mutations/StoreHeaderTabOrder';

export default function Variant() {
  return (
    <StoreProvider>
      <App parts={{ ...baseParts, StoreHeader: StoreHeaderTabOrder }} />
    </StoreProvider>
  );
}
