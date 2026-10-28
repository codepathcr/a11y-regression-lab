import App from '../App';
import { baseParts } from '../parts';
import { StoreProvider } from '../store/StoreProvider';
import { CartViewComputed } from '../mutations/CartViewComputed';

export default function Variant() {
  return (
    <StoreProvider>
      <App parts={{ ...baseParts, CartView: CartViewComputed }} />
    </StoreProvider>
  );
}
