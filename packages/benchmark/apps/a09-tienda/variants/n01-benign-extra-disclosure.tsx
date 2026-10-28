import App from '../App';
import { baseParts } from '../parts';
import { StoreProvider } from '../store/StoreProvider';
import { StoreFooterExtraNote } from '../mutations/StoreFooterExtraNote';

export default function Variant() {
  return (
    <StoreProvider>
      <App parts={{ ...baseParts, StoreFooter: StoreFooterExtraNote }} />
    </StoreProvider>
  );
}
