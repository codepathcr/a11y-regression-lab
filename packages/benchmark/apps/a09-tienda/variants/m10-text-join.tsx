import App from '../App';
import { baseParts } from '../parts';
import { StoreProvider } from '../store/StoreProvider';
import { StoreHeaderTextJoin } from '../mutations/StoreHeaderTextJoin';

export default function Variant() {
  return (
    <StoreProvider>
      <App parts={{ ...baseParts, StoreHeader: StoreHeaderTextJoin }} />
    </StoreProvider>
  );
}
