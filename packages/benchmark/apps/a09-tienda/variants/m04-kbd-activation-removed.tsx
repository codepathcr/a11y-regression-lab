import App from '../App';
import { baseParts } from '../parts';
import { StoreProvider } from '../store/StoreProvider';
import { ProductDetailViewNoKeyboard } from '../mutations/ProductDetailViewNoKeyboard';

export default function Variant() {
  return (
    <StoreProvider>
      <App parts={{ ...baseParts, ProductDetailView: ProductDetailViewNoKeyboard }} />
    </StoreProvider>
  );
}
