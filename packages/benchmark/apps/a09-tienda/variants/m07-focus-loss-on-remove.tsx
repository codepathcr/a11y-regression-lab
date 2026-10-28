import App from '../App';
import { baseParts } from '../parts';
import { StoreProvider } from '../store/StoreProvider';
import { CartViewNoFocus } from '../mutations/CartViewNoFocus';

export default function Variant() {
  return (
    <StoreProvider>
      <App parts={{ ...baseParts, CartView: CartViewNoFocus }} />
    </StoreProvider>
  );
}
